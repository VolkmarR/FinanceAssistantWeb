using System.ClientModel;
using FinanceAssistant.Telemetry;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenAI;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddChatClient(this IServiceCollection services, IConfiguration config)
    {
        var endpoint = config["AzureOpenAI:Endpoint"]
                       ?? throw new InvalidOperationException("Missing AzureOpenAI:Endpoint.");
        var apiKey = config["AzureOpenAI:ApiKey"]
                     ?? throw new InvalidOperationException("Missing AzureOpenAI:ApiKey.");
        var deployment = config["AzureOpenAI:Deployment"]
                         ?? throw new InvalidOperationException("Missing AzureOpenAI:Deployment.");

        // /openai/v1/ is the OpenAI SDK's Azure v1-compatible surface.
        var apiBase = new UriBuilder(endpoint) { Path = "openai/v1/" }.Uri;

        return services.AddSingleton<IChatClient>(_ =>
            new OpenAIClient(
                    new ApiKeyCredential(apiKey),
                    new OpenAIClientOptions { Endpoint = apiBase })
                .GetChatClient(deployment)
                .AsIChatClient()
                // OpenTelemetry traces every LLM call, including direct uses outside the agent
                // loop (e.g. ImportStatementTool's CSV-format detection).
                // NOTE: deliberately NOT calling .UseFunctionInvocation() — the agent loop is
                // implemented manually; UseOpenTelemetry is orthogonal instrumentation.
                .AsBuilder()
                .UseOpenTelemetry(
                    sourceName: AppTelemetry.SourceName,
                    configure: c => c.EnableSensitiveData = true)
                .Build());
    }

    public static IServiceCollection AddEmbeddingGenerator(this IServiceCollection services, IConfiguration config)
    {
        var endpoint = config["AzureOpenAI:Endpoint"]
                       ?? throw new InvalidOperationException("Missing AzureOpenAI:Endpoint.");
        var apiKey = config["AzureOpenAI:ApiKey"]
                     ?? throw new InvalidOperationException("Missing AzureOpenAI:ApiKey.");
        var embeddingDeployment = config["AzureOpenAI:EmbeddingDeployment"]
                                  ?? throw new InvalidOperationException("Missing AzureOpenAI:EmbeddingDeployment.");

        var apiBase = new UriBuilder(endpoint) { Path = "openai/v1/" }.Uri;

        return services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>>(_ =>
            new OpenAIClient(
                    new ApiKeyCredential(apiKey),
                    new OpenAIClientOptions { Endpoint = apiBase })
                .GetEmbeddingClient(embeddingDeployment)
                .AsIEmbeddingGenerator()
                .AsBuilder()
                .UseOpenTelemetry(sourceName: AppTelemetry.SourceName)
                .Build());
    }
}
