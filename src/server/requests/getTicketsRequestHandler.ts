import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GetTicketsArgs {
  apiKey: string;
  status?: "active" | "completed" | "canceled";
  limit?: number;
}

export async function handleRequest(
  args: GetTicketsArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate arguments
    if (!args.apiKey) {
      throw new McpError(ErrorCode.InvalidParams, "API key is required");
    }

    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    // Get authenticated user
    const me = await linearClient.viewer;

    // Build query options
    const queryOptions: Record<string, unknown> = {
      first: args.limit || 10,
    };

    if (args.status) {
      queryOptions.filter = {
        state: {
          type: {
            eq: args.status,
          },
        },
      };
    }

    // Get user's assigned issues
    const issues = await me.assignedIssues(queryOptions);

    if (!issues.nodes.length) {
      return {
        content: [
          {
            type: "text",
            text: "No tickets found matching the criteria.",
          },
        ],
      };
    }

    // Format the issues
    const formattedIssues = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = await issue.state;
        return {
          id: issue.id,
          title: issue.title,
          status: state?.name || "Unknown",
          priority: issue.priority,
          url: issue.url,
          createdAt: issue.createdAt,
        };
      }),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedIssues, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch Linear tickets: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
