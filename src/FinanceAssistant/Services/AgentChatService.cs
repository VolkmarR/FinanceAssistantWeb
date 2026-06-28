using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading;
using FinanceAssistant.Telemetry;
using FinanceAssistant.Tools;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Pgvector;

namespace FinanceAssistant.Services;

// Owns the single ChatClientAgent and an in-memory conversation session per sessionId.
// This replaces the manual agent/tool wiring that used to live in the console Program.cs.
// Sessions are kept only in process memory — there is no persistence yet (a later pillar).
public sealed class AgentChatService
{
    // OpenTelemetryAgent (an AIAgent) wrapping the ChatClientAgent — emits a span per agent run.
    private readonly AIAgent _agent;
    private readonly ConcurrentDictionary<string, AgentSession> _sessions = new();

    // Exposed so the AG-UI endpoint can host the same configured agent (tools, prompt, approvals).
    public AIAgent Agent => _agent;

    public AgentChatService(
        IChatClient chatClient,
        IEmbeddingGenerator<string, Embedding<float>> embedder)
    {
        var convertCurrency = new ConvertCurrencyTool();
        var getCurrentTime = new CurrentTimeTool();
        var getTransactions = new GetTransactionsTool();
        var searchTransactions = new SearchTransactionsTool(embedder);
        var importStatementTool = new ImportStatementTool(chatClient);
        var importXmlStatementTool = new ImportXmlStatementTool(importStatementTool);
        var importXlsxStatementTool = new ImportXlsxStatementTool(importStatementTool);
        var transferFunds = new TransferFundsTool();

        var systemPrompt = File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "Prompts", "SystemPrompt.md"));

        _agent = new ChatClientAgent(
                chatClient,
                systemPrompt,
                name: "FinanceAssistant",
                description: "Personal finance assistant",
                tools:
                [
                    AIFunctionFactory.Create(convertCurrency.Convert),
                    AIFunctionFactory.Create(getCurrentTime.GetCurrentTime),
                    AIFunctionFactory.Create(getTransactions.GetTransactions),
                    AIFunctionFactory.Create(searchTransactions.SearchTransactions),
                    AIFunctionFactory.Create(importStatementTool.ImportStatement),
                    AIFunctionFactory.Create(importXmlStatementTool.ImportXmlStatement),
                    AIFunctionFactory.Create(importXlsxStatementTool.ImportXlsxStatement),
                    new ApprovalRequiredAIFunction(AIFunctionFactory.Create(transferFunds.Transfer))
                ])
            // Wrap the agent so each run (including the tool loop) produces a telemetry span.
            // EnableSensitiveData surfaces prompt/response/tool-argument text in the dashboard.
            .AsBuilder()
            .UseOpenTelemetry(AppTelemetry.SourceName, a => a.EnableSensitiveData = true)
            .Build();
    }

    // Streams the assistant's reply for one turn, yielding text chunks as they arrive.
    // The session for the given id is created on first use and reused for follow-ups,
    // which is what gives the conversation continuity across requests.
    public async IAsyncEnumerable<string> StreamReplyAsync(
        string sessionId,
        string message,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var session = await GetOrCreateSessionAsync(sessionId, ct);

        await foreach (var update in _agent.RunStreamingAsync(message, session, cancellationToken: ct))
        {
            if (!string.IsNullOrEmpty(update.Text))
            {
                yield return update.Text;
            }
        }
    }

    private async ValueTask<AgentSession> GetOrCreateSessionAsync(string sessionId, CancellationToken ct)
    {
        if (_sessions.TryGetValue(sessionId, out var existing))
        {
            return existing;
        }

        // CreateSessionAsync may do real work, so we create outside the dictionary and
        // let the first writer win — any extra session created on a race is simply dropped.
        var created = await _agent.CreateSessionAsync(ct);
        return _sessions.GetOrAdd(sessionId, created);
    }
}
