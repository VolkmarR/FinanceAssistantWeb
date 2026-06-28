namespace FinanceAssistant.Telemetry;

// Telemetry identifiers shared across the app. Using one source/meter name for the agent,
// chat client, and embedding generator keeps every GenAI span and metric under a single
// name we register once with the tracer/meter providers.
public static class AppTelemetry
{
    public const string ServiceName = "FinanceAssistant";

    // Passed as both the ActivitySource name and the Meter name to UseOpenTelemetry(...).
    public const string SourceName = "FinanceAssistant.AI";
}
