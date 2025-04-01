import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GetWorkflowStatesArgs {
  apiKey: string;
  teamId?: string;
  teamKey?: string;
}

/**
 * Handler for getting workflow states for a team
 */
export async function handleRequest(
  args: GetWorkflowStatesArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Validate API key
  if (!args.apiKey) {
    throw new McpError(ErrorCode.InvalidParams, "Linear API key is required");
  }

  // Validate team identification
  if (!args.teamId && !args.teamKey) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Either teamId or teamKey is required",
    );
  }

  try {
    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    let teamId = args.teamId;

    // If we only have a team key, get the team ID first
    if (args.teamKey && !teamId) {
      try {
        const teams = await linearClient.teams({
          filter: {
            key: {
              eq: args.teamKey,
            },
          },
        });

        if (teams.nodes.length === 0) {
          throw new McpError(
            ErrorCode.InternalError,
            `Team not found with key: ${args.teamKey}`,
          );
        }

        teamId = teams.nodes[0].id;
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to find team with key ${args.teamKey}: ${(error as Error).message}`,
        );
      }
    }

    // Get workflow states for the team
    const workflowStates = await linearClient.workflowStates({
      filter: teamId
        ? {
            team: {
              id: {
                eq: teamId,
              },
            },
          }
        : undefined,
    });

    const states = workflowStates.nodes.map((state) => {
      // Extract standard properties
      const stateInfo: Record<string, unknown> = {
        id: state.id,
        name: state.name,
        type: state.type,
      };

      // Safely add any additional properties that might exist
      if ("color" in state) {
        stateInfo.color = state.color as string;
      }

      return stateInfo;
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(states, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get workflow states: ${(error as Error).message}`,
    );
  }
}
