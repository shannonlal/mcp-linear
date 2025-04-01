import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface UpdateTicketArgs {
  apiKey: string;
  ticketId: string;
  title?: string;
  description?: string;
  stateId?: string;
  assigneeId?: string;
  priority?: number;
  dueDate?: string;
  estimate?: number;
}

export interface UpdateTicketResponse {
  success: boolean;
  message: string;
  ticket: {
    id: string;
    title: string;
    description?: string;
    number: number;
    key: string;
    updatedAt: string;
    url: string;
  };
}

/**
 * Handler for updating a specific ticket
 */
export async function handleRequest(
  args: UpdateTicketArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Validate API key
  if (!args.apiKey) {
    throw new McpError(ErrorCode.InvalidParams, "Linear API key is required");
  }

  // Validate ticket ID
  if (!args.ticketId) {
    throw new McpError(ErrorCode.InvalidParams, "Ticket ID or key is required");
  }

  // Check if there's at least one field to update
  const updateFields = [
    "title",
    "description",
    "stateId",
    "assigneeId",
    "priority",
    "dueDate",
    "estimate",
  ];

  const hasUpdateField = updateFields.some(
    (field) => args[field as keyof UpdateTicketArgs] !== undefined,
  );

  if (!hasUpdateField) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "At least one field to update is required",
    );
  }

  // Validate priority if provided
  if (args.priority !== undefined && (args.priority < 0 || args.priority > 4)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Priority must be between 0 and 4",
    );
  }

  try {
    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    // Prepare update payload
    const updateData: Record<string, unknown> = {};

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined)
      updateData.description = args.description;

    // Special handling for stateId if it's not a UUID but a name like "done"
    let stateId = args.stateId;
    if (
      stateId &&
      (stateId.toLowerCase() === "done" ||
        stateId.toLowerCase() === "completed")
    ) {
      // Will be set after finding the issue and its workflow states
      stateId = undefined;
    } else if (args.stateId) {
      updateData.stateId = args.stateId;
    }

    if (args.assigneeId !== undefined) updateData.assigneeId = args.assigneeId;
    if (args.priority !== undefined) updateData.priority = args.priority;
    if (args.dueDate !== undefined) updateData.dueDate = args.dueDate;
    if (args.estimate !== undefined) updateData.estimate = args.estimate;

    // Try to find issues that match our criteria
    let issue;
    try {
      // Look for issues with the given ID or key
      if (args.ticketId.includes("-")) {
        // It's a ticket key like "ABC-123"
        const [teamKey, issueNumber] = args.ticketId.split("-");

        // Get issues that match the team key and issue number
        const issues = await linearClient.issues({
          filter: {
            team: {
              key: {
                eq: teamKey,
              },
            },
            number: {
              eq: parseInt(issueNumber, 10),
            },
          },
        });

        if (issues.nodes.length === 0) {
          throw new McpError(
            ErrorCode.InternalError,
            `Ticket not found: ${args.ticketId}`,
          );
        }

        issue = issues.nodes[0];
      } else {
        // It's likely an ID
        const issues = await linearClient.issues({
          filter: {
            id: {
              eq: args.ticketId,
            },
          },
        });

        if (issues.nodes.length === 0) {
          throw new McpError(
            ErrorCode.InternalError,
            `Ticket not found: ${args.ticketId}`,
          );
        }

        issue = issues.nodes[0];
      }
    } catch (error) {
      console.error("Error finding ticket:", error);
      throw new McpError(
        ErrorCode.InternalError,
        `Could not find ticket: ${args.ticketId}`,
      );
    }

    // Check if issue exists
    if (!issue) {
      throw new McpError(
        ErrorCode.InternalError,
        `Ticket not found: ${args.ticketId}`,
      );
    }

    // Handle special state names like "done" or "completed"
    if (
      args.stateId &&
      (args.stateId.toLowerCase() === "done" ||
        args.stateId.toLowerCase() === "completed")
    ) {
      try {
        // Get the team for this issue to find its workflow
        const teamId = issue.teamId;

        // If the issue has no teamId, try to get it from the ticket key
        let effectiveTeamId = teamId;
        if (!effectiveTeamId && args.ticketId.includes("-")) {
          const [teamKey] = args.ticketId.split("-");

          try {
            const teams = await linearClient.teams({
              filter: {
                key: {
                  eq: teamKey,
                },
              },
            });

            if (teams.nodes.length > 0) {
              effectiveTeamId = teams.nodes[0].id;
            }
          } catch (error) {
            // Just log the error and continue with null team ID
            console.warn(`Error finding team by key ${teamKey}:`, error);
          }
        }

        if (effectiveTeamId) {
          // Get workflow states for this team
          const workflowStates = await linearClient.workflowStates({
            filter: {
              team: {
                id: {
                  eq: effectiveTeamId,
                },
              },
            },
          });

          // Find the "Done" or "Completed" state
          const doneState = workflowStates.nodes.find(
            (state) =>
              state.name.toLowerCase() === "done" ||
              state.name.toLowerCase() === "completed" ||
              state.type === "completed",
          );

          if (doneState) {
            updateData.stateId = doneState.id;
          } else {
            throw new McpError(
              ErrorCode.InternalError,
              `Could not find a 'Done' state for this team`,
            );
          }
        } else {
          throw new McpError(
            ErrorCode.InternalError,
            `Ticket does not have a team, cannot determine workflow states`,
          );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to find 'Done' state: ${(error as Error).message}`,
        );
      }
    }

    // Update the issue using the updateIssue method
    const updateResult = await linearClient.updateIssue(issue.id, updateData);

    if (!updateResult.success) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update ticket: ${args.ticketId}`,
      );
    }

    // Get the updated issue
    const updatedIssue = updateResult.issue;

    // Get team data for key formatting if needed
    let team = null;
    if (updatedIssue.teamId) {
      try {
        const teams = await linearClient.teams({
          filter: {
            id: {
              eq: updatedIssue.teamId,
            },
          },
        });

        if (teams && teams.nodes.length > 0) {
          const teamData = teams.nodes[0];
          team = {
            id: teamData.id,
            name: teamData.name || "Unknown",
            key: teamData.key || "TEAM",
          };
        }
      } catch (error) {
        console.warn("Error fetching team:", error);
      }
    }

    // Get state data if available
    let state = null;
    if (updatedIssue.stateId) {
      try {
        const states = await linearClient.workflowStates({
          filter: {
            id: {
              eq: updatedIssue.stateId,
            },
          },
        });

        if (states && states.nodes.length > 0) {
          const stateData = states.nodes[0];
          state = {
            id: stateData.id,
            name: stateData.name || "Unknown",
            type: stateData.type || "Unknown",
          };
        }
      } catch (error) {
        console.warn("Error fetching state:", error);
      }
    }

    // Generate the key if not available
    const ticketKey =
      updatedIssue.key ||
      (team
        ? `${team.key}-${updatedIssue.number}`
        : `ISSUE-${updatedIssue.number}`);

    // Format the response data
    const responseData = {
      success: true,
      message: "Ticket updated successfully",
      ticket: {
        id: updatedIssue.id,
        title: updatedIssue.title,
        description: updatedIssue.description,
        number: updatedIssue.number,
        key: ticketKey,
        updatedAt: updatedIssue.updatedAt,
        state: state,
        url: updatedIssue.url,
      },
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

    console.error("Error updating ticket:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to update ticket: ${(error as Error).message}`,
    );
  }
}
