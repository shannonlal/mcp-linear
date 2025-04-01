import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GetTicketByIdArgs {
  apiKey: string;
  ticketId: string;
}

export interface TicketResponse {
  id: string;
  title: string;
  description?: string;
  number: number;
  key: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimate?: number;
  priority?: number;
  assignee: { id: string; name: string; email: string } | null;
  team: { id: string; name: string; key: string } | null;
  state: { id: string; name: string; type: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  url: string;
}

// Define interfaces for GraphQL response
interface GraphQLIssueResponse {
  issue?: {
    id: string;
    title: string;
    description?: string;
    number: number;
    priority?: number;
    estimate?: number;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    team?: {
      id: string;
      name: string;
      key: string;
    } | null;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
    state?: {
      id: string;
      name: string;
      type: string;
    } | null;
    labels?: {
      nodes: Array<{
        id: string;
        name: string;
        color: string;
      }>;
    };
  };
  issueByTeamKeyAndNumber?: {
    id: string;
    title: string;
    description?: string;
    number: number;
    priority?: number;
    estimate?: number;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    team?: {
      id: string;
      name: string;
      key: string;
    } | null;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
    state?: {
      id: string;
      name: string;
      type: string;
    } | null;
    labels?: {
      nodes: Array<{
        id: string;
        name: string;
        color: string;
      }>;
    };
  };
}

/**
 * Handler for retrieving a specific ticket by ID or key
 */
export async function handleRequest(
  args: GetTicketByIdArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Validate API key
  if (!args.apiKey) {
    throw new McpError(ErrorCode.InvalidParams, "Linear API key is required");
  }

  // Validate ticket ID
  if (!args.ticketId) {
    throw new McpError(ErrorCode.InvalidParams, "Ticket ID or key is required");
  }

  try {
    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    let issueId: string | undefined;
    let teamKey: string | undefined;
    let issueNumber: string | undefined;

    // Parse the ticket ID to determine if it's a key or ID
    if (args.ticketId.includes("-")) {
      // It's a ticket key like "ABC-123"
      const parts = args.ticketId.split("-");
      teamKey = parts[0];
      issueNumber = parts[1];
    } else {
      // It's likely an ID
      issueId = args.ticketId;
    }

    // Query with all the needed fields and relationships using GraphQL
    // The Linear SDK uses GraphQL under the hood
    const query = `
      query GetIssue(${issueId ? "$id: ID!" : "$teamKey: String!, $number: Int!"}) {
        ${issueId ? "issue(id: $id)" : "issueByTeamKeyAndNumber(teamKey: $teamKey, number: $number)"} {
          id
          title
          description
          number
          priority
          estimate
          dueDate
          createdAt
          updatedAt
          url
          
          team {
            id
            name
            key
          }
          
          assignee {
            id
            name
            email
          }
          
          state {
            id
            name
            type
          }
          
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `;

    const variables = issueId
      ? { id: issueId }
      : { teamKey, number: issueNumber ? parseInt(issueNumber, 10) : 0 };

    try {
      // Using private _request method to run custom GraphQL
      const response = await linearClient._request<GraphQLIssueResponse>(
        query,
        variables,
      );

      // Check if we got a valid response
      const issue = response?.issue || response?.issueByTeamKeyAndNumber;

      if (!issue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ticket not found: ${args.ticketId}`,
        );
      }

      // Format the ticket data using the complete GraphQL response
      const ticketData = {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        number: issue.number,
        key: issue.team
          ? `${issue.team.key}-${issue.number}`
          : `ISSUE-${issue.number}`,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        dueDate: issue.dueDate,
        estimate: issue.estimate,
        priority: issue.priority,

        // These fields come directly from the GraphQL query includes
        assignee: issue.assignee || null,
        team: issue.team || null,
        state: issue.state || null,

        // Map labels from the nodes array
        labels: issue.labels?.nodes || [],

        url: issue.url,
      };

      // Return in the format expected by the MCP
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(ticketData, null, 2),
          },
        ],
      };
    } catch (graphqlError) {
      // If GraphQL approach fails, fall back to the original approach

      // Continue with the original approach
      let issue;
      try {
        if (teamKey && issueNumber) {
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
            // Request expanded data where possible
            includeAssignee: true,
            includeTeam: true,
            includeState: true,
            includeLabels: true,
          });

          if (issues.nodes.length === 0) {
            throw new McpError(
              ErrorCode.InternalError,
              `Ticket not found: ${args.ticketId}`,
            );
          }

          issue = issues.nodes[0];
        } else {
          // It's likely an ID, try to get it directly
          const issues = await linearClient.issues({
            filter: {
              id: {
                eq: args.ticketId,
              },
            },
            // Request expanded data where possible
            includeAssignee: true,
            includeTeam: true,
            includeState: true,
            includeLabels: true,
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

      // Get additional data for the ticket - load more aggressively
      // For assignee
      let assignee = null;
      if (issue.assigneeId) {
        try {
          const users = await linearClient.users({
            filter: {
              id: {
                eq: issue.assigneeId,
              },
            },
          });

          if (users && users.nodes.length > 0) {
            const userData = users.nodes[0];
            assignee = {
              id: userData.id,
              name: userData.name || "Unknown",
              email: userData.email || "",
            };
          }
        } catch (error) {
          console.warn("Error fetching assignee:", error);
        }
      }

      // For team
      let team = null;
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
      } else if (teamKey) {
        // If we don't have teamId but we parsed a teamKey, try to look it up
        try {
          const teams = await linearClient.teams({
            filter: {
              key: {
                eq: teamKey,
              },
            },
          });

          if (teams && teams.nodes.length > 0) {
            const teamData = teams.nodes[0];
            team = {
              id: teamData.id,
              name: teamData.name || "Unknown",
              key: teamData.key || teamKey,
            };
          }
        } catch (error) {
          console.warn("Error fetching team by key:", error);
        }
      }

      // For state
      let state = null;
      if (issue.stateId) {
        try {
          const states = await linearClient.workflowStates({
            filter: {
              id: {
                eq: issue.stateId,
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

      // For labels - fetch complete label information
      let labels: Array<{ id: string; name: string; color: string }> = [];
      if (issue.labelIds && issue.labelIds.length > 0) {
        try {
          // Get all labels for the project
          const allLabels = await linearClient.issueLabels();

          // Filter to the ones we need
          labels = issue.labelIds.map((labelId: string) => {
            const foundLabel = allLabels.nodes.find((l) => l.id === labelId);
            if (foundLabel) {
              return {
                id: foundLabel.id,
                name: foundLabel.name || "Unknown",
                color: foundLabel.color || "#cccccc",
              };
            }
            return { id: labelId, name: "Unknown", color: "#cccccc" };
          });
        } catch (error) {
          console.warn("Error fetching labels:", error);
          // Fallback to just IDs
          labels = issue.labelIds.map((id: string) => ({
            id,
            name: "Unknown",
            color: "#cccccc",
          }));
        }
      }

      // Generate the key if not available
      const ticketKey =
        issue.key ||
        (team ? `${team.key}-${issue.number}` : `ISSUE-${issue.number}`);

      // Format the ticket data
      const ticketData = {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        number: issue.number,
        key: ticketKey,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        dueDate: issue.dueDate,
        estimate: issue.estimate,
        priority: issue.priority,
        assignee,
        team,
        state,
        labels,
        url: issue.url,
      };

      // Return in the format expected by the MCP
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(ticketData, null, 2),
          },
        ],
      };
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    console.error("Error retrieving ticket:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve ticket: ${(error as Error).message}`,
    );
  }
}
