import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GetTicketsArgs {
  apiKey: string;
  status?: string;
  limit?: number;
}

export interface TicketListResponse {
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    priority?: number;
    number: number;
    key: string;
    url: string;
  }>;
  total: number;
}

/**
 * Handler for retrieving tickets from Linear
 */
export async function handleRequest(
  args: GetTicketsArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    if (!args.apiKey) {
      throw new McpError(ErrorCode.InvalidParams, "API key is required");
    }

    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    // Get currently authenticated user (not needed with our new approach)
    // Instead, we'll query issues directly

    // Prepare filter
    const filter: Record<string, unknown> = {};

    // Add status filter if provided
    if (args.status) {
      // Map our status names to Linear's state types
      const statusMap: Record<string, string> = {
        active: "started",
        completed: "completed",
        canceled: "canceled",
      };

      const stateType = statusMap[args.status];
      if (stateType) {
        filter.state = {
          type: {
            eq: stateType,
          },
        };
      }
    }

    // Apply limit if provided
    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 50) : 10;

    // Get issues with filter
    const issues = await linearClient.issues({
      filter,
      first: limit,
    });

    // Format the tickets
    const tickets = await Promise.all(
      issues.nodes.map(async (issue) => {
        let stateData = { name: "Unknown" };

        if (issue.stateId) {
          const workflowState = await linearClient.workflowState(issue.stateId);
          if (workflowState) {
            stateData = await workflowState.fetch();
          }
        }

        // Get team for the key
        let teamKey = "UNKNOWN";
        if (issue.teamId) {
          try {
            const teams = await linearClient.teams({
              filter: {
                id: {
                  eq: issue.teamId,
                },
              },
            });

            if (teams && teams.nodes.length > 0) {
              teamKey = teams.nodes[0].key || "TEAM";
            }
          } catch (error) {
            console.warn("Error fetching team:", error);
          }
        }

        return {
          id: issue.id,
          title: issue.title,
          status: stateData.name,
          priority: issue.priority,
          number: issue.number,
          key: issue.key || `${teamKey}-${issue.number}`,
          url: issue.url,
        };
      }),
    );

    const responseData = {
      tickets,
      total: tickets.length,
    };

    // Return in the format expected by the MCP
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    console.error("Error fetching tickets:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch Linear tickets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
