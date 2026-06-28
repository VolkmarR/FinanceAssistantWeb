using System.Text.Json;
using FinanceAssistant.Data;
using FinanceAssistant.Services;
using FinanceAssistant.Telemetry;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Npgsql;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Pgvector;

const string DevCorsPolicy = "ViteDev";

var builder = WebApplication.CreateBuilder(args);

// Preserve the console app's configuration sources so the same AzureOpenAI:* secrets work.
builder.Configuration
    .AddUserSecrets<Program>(optional: true)
    .AddEnvironmentVariables();

// OpenTelemetry: traces, metrics, and logs exported over OTLP to the Aspire dashboard.
// The OTLP endpoint comes from OTEL_EXPORTER_OTLP_ENDPOINT (see launchSettings.json), so
// there is no hard-coded URL here. Agent/chat/embedding spans flow through AppTelemetry.SourceName.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService(AppTelemetry.ServiceName))
    .WithTracing(t => t
        .AddSource(AppTelemetry.SourceName)     // agent run + LLM + embedding spans (GenAI conventions)
        .AddAspNetCoreInstrumentation()         // incoming /api/chat, /api/agui requests
        .AddHttpClientInstrumentation()         // outbound Azure OpenAI HTTP calls
        .AddNpgsql()                            // Postgres/pgvector queries
        .AddOtlpExporter())
    .WithMetrics(m => m
        .AddMeter(AppTelemetry.SourceName)      // GenAI token usage / operation duration
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

builder.Logging.AddOpenTelemetry(o =>
{
    o.IncludeFormattedMessage = true;
    o.IncludeScopes = true;
    o.AddOtlpExporter();
});

// Reuse the existing DI extensions unchanged (ServiceCollectionExtensions.cs).
builder.Services.AddChatClient(builder.Configuration);
builder.Services.AddEmbeddingGenerator(builder.Configuration);

// One agent + per-session conversation store shared across requests.
builder.Services.AddSingleton<AgentChatService>();

// AG-UI protocol services (typed event SSE) for the /api/agui endpoint mapped below.
builder.Services.AddAGUI();

// Allow the Vite dev server (separate origin) to call the API during development.
// In production the SPA is served from wwwroot, so it is same-origin and CORS is moot.
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

// Startup warm-up: create the schema and embed any transactions that lack an embedding.
// Ported verbatim from the console Program.cs so semantic search works on first run.
await WarmUpAsync(app);

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

app.UseDefaultFiles();
app.UseStaticFiles();

// POST /api/chat — streams the assistant reply as Server-Sent Events.
app.MapPost("/api/chat", async (ChatRequest request, AgentChatService chat, HttpContext http) =>
{
    if (string.IsNullOrWhiteSpace(request.Message))
    {
        http.Response.StatusCode = StatusCodes.Status400BadRequest;
        await http.Response.WriteAsync("message is required");
        return;
    }

    var sessionId = string.IsNullOrWhiteSpace(request.SessionId) ? "default" : request.SessionId;

    http.Response.ContentType = "text/event-stream";
    http.Response.Headers.CacheControl = "no-cache";
    http.Response.Headers.Connection = "keep-alive";

    var ct = http.RequestAborted;

    try
    {
        await foreach (var chunk in chat.StreamReplyAsync(sessionId, request.Message, ct))
        {
            // One SSE "data:" frame per chunk; JSON-encoding keeps newlines/quotes intact.
            await http.Response.WriteAsync($"data: {JsonSerializer.Serialize(chunk)}\n\n", ct);
            await http.Response.Body.FlushAsync(ct);
        }

        await http.Response.WriteAsync("event: done\ndata: [DONE]\n\n", ct);
        await http.Response.Body.FlushAsync(ct);
    }
    catch (OperationCanceledException)
    {
        // Client disconnected mid-stream. Nothing to do — the response is already gone.
    }
});

// POST /api/agui — exposes the same agent over the AG-UI protocol (typed SSE events).
var agentChat = app.Services.GetRequiredService<AgentChatService>();
app.MapAGUI("/api/agui", agentChat.Agent);

// SPA fallback so client-side routes resolve to the React entry point.
app.MapFallbackToFile("index.html");

app.Run();

static async Task WarmUpAsync(WebApplication app)
{
    await using (var db = new FinanceDbContext())
    {
        await db.Database.EnsureCreatedAsync();
    }

    var embedder = app.Services.GetRequiredService<IEmbeddingGenerator<string, Embedding<float>>>();

    await using var seedDb = new FinanceDbContext();
    var unembedded = await seedDb.Transactions
        .Where(t => t.Embedding == null)
        .ToListAsync();

    if (unembedded.Count > 0)
    {
        app.Logger.LogInformation("Embedding {Count} transactions...", unembedded.Count);
        var texts = unembedded.Select(t => $"{t.Merchant} {t.Description}").ToList();
        var embeddings = await embedder.GenerateAsync(texts);
        for (int i = 0; i < unembedded.Count; i++)
        {
            unembedded[i].Embedding = new Vector(embeddings[i].Vector.ToArray());
        }

        await seedDb.SaveChangesAsync();
        app.Logger.LogInformation("Embedded {Count} transactions.", unembedded.Count);
    }
}

// Minimal API request body for the chat endpoint.
internal sealed record ChatRequest(string? SessionId, string Message);
