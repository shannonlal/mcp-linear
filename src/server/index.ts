#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  Request,
} from "@modelcontextprotocol/sdk/types.js";

declare const process: NodeJS.Process;

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

class LinearMcpServer {
  private server: Server;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.server = new Server(
      {
        name: "linear-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupTools();
  }

  private setupTools(): void {
    // Define available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: "get-linear-tickets",
          description: "Get tickets from Linear API for the authenticated user",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                description:
                  "Optional status to filter tickets (e.g. 'active', 'completed')",
                enum: ["active", "completed", "canceled"],
              },
              limit: {
                type: "number",
                description:
                  "Maximum number of tickets to return (default: 10)",
                minimum: 1,
                maximum: 50,
              },
            },
          },
        },
        {
          name: "get-linear-projects",
          description: "Get projects from Linear API",
          inputSchema: {
            type: "object",
            properties: {
              search: {
                type: "string",
                description:
                  "Optional search term to find specific projects by name or description",
              },
              status: {
                type: "string",
                description:
                  "Optional status to filter projects (e.g. 'planned', 'started', 'completed')",
                enum: ["planned", "started", "paused", "completed", "canceled"],
              },
              limit: {
                type: "number",
                description:
                  "Maximum number of projects to return (default: 10)",
                minimum: 1,
                maximum: 50,
              },
            },
          },
        },
        {
          name: "get-linear-ticket",
          description:
            "Get detailed information about a specific Linear ticket",
          inputSchema: {
            type: "object",
            properties: {
              ticketId: {
                type: "string",
                description:
                  "The ID or key of the ticket (e.g., 'PLA-524' or '29ede43e806c')",
              },
            },
            required: ["ticketId"],
          },
        },
        {
          name: "update-linear-ticket",
          description: "Update information for a specific Linear ticket",
          inputSchema: {
            type: "object",
            properties: {
              ticketId: {
                type: "string",
                description: "The ID or key of the ticket to update",
              },
              title: {
                type: "string",
                description: "New title for the ticket",
              },
              description: {
                type: "string",
                description: "New description for the ticket",
              },
              stateId: {
                type: "string",
                description: "ID of the state to set for the ticket",
              },
              assigneeId: {
                type: "string",
                description: "ID of the user to assign the ticket to",
              },
              priority: {
                type: "number",
                description: "Priority level (0-4)",
                minimum: 0,
                maximum: 4,
              },
              dueDate: {
                type: "string",
                description: "Due date in ISO format (YYYY-MM-DD)",
              },
              estimate: {
                type: "number",
                description: "Estimate in points",
              },
            },
            required: ["ticketId"],
          },
        },
        {
          name: "update-linear-project",
          description: "Update information for a specific Linear project",
          inputSchema: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the project to update",
              },
              name: {
                type: "string",
                description: "New name for the project",
              },
              description: {
                type: "string",
                description: "New description for the project",
              },
              stateId: {
                type: "string",
                description: "ID of the state to set for the project",
              },
              teamIds: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "IDs of teams associated with the project",
              },
              startDate: {
                type: "string",
                description: "Start date in ISO format (YYYY-MM-DD)",
              },
              targetDate: {
                type: "string",
                description: "Target date in ISO format (YYYY-MM-DD)",
              },
              progress: {
                type: "number",
                description: "Progress percentage (0-1)",
                minimum: 0,
                maximum: 1,
              },
              icon: {
                type: "string",
                description: "Icon for the project",
              },
              color: {
                type: "string",
                description: "Color for the project",
              },
            },
            required: ["projectId"],
          },
        },
        {
          name: "get-linear-workflow-states",
          description: "Get workflow states for a Linear team",
          inputSchema: {
            type: "object",
            properties: {
              teamId: {
                type: "string",
                description: "ID of the team to get workflow states for",
              },
              teamKey: {
                type: "string",
                description:
                  "Key of the team to get workflow states for (e.g. 'PLA')",
              },
            },
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        switch (request.params.name) {
          case "get-linear-tickets": {
            const { handleRequest } = await import(
              "./requests/getTicketsRequestHandler.js"
            );
            // Add API key to the arguments
            const args = {
              ...request.params.arguments,
              apiKey: this.apiKey,
            };
            return handleRequest(args);
          }
          case "get-linear-projects": {
            const { handleRequest } = await import(
              "./requests/getProjectsRequestHandler.js"
            );
            // Add API key to the arguments
            const args = {
              ...request.params.arguments,
              apiKey: this.apiKey,
            };
            return handleRequest(args);
          }
          case "get-linear-ticket": {
            const { handleRequest } = await import(
              "./requests/getTicketByIdHandler.js"
            );

            // Get the ticketId from the request
            const { ticketId } = request.params.arguments as {
              ticketId?: string;
            };
            if (!ticketId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "ticketId is required",
              );
            }

            return handleRequest({
              apiKey: this.apiKey,
              ticketId,
            });
          }
          case "update-linear-ticket": {
            const { handleRequest } = await import(
              "./requests/updateTicketHandler.js"
            );

            // Extract all arguments from the request
            const {
              ticketId,
              title,
              description,
              stateId,
              assigneeId,
              priority,
              dueDate,
              estimate,
            } = request.params.arguments as {
              ticketId?: string;
              title?: string;
              description?: string;
              stateId?: string;
              assigneeId?: string;
              priority?: number;
              dueDate?: string;
              estimate?: number;
            };

            if (!ticketId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "ticketId is required",
              );
            }

            return handleRequest({
              apiKey: this.apiKey,
              ticketId,
              title,
              description,
              stateId,
              assigneeId,
              priority,
              dueDate,
              estimate,
            });
          }
          case "update-linear-project": {
            const { handleRequest } = await import(
              "./requests/updateProjectHandler.js"
            );

            // Extract all arguments from the request
            const {
              projectId,
              name,
              description,
              stateId,
              teamIds,
              startDate,
              targetDate,
              progress,
              icon,
              color,
            } = request.params.arguments as {
              projectId?: string;
              name?: string;
              description?: string;
              stateId?: string;
              teamIds?: string[];
              startDate?: string;
              targetDate?: string;
              progress?: number;
              icon?: string;
              color?: string;
            };

            if (!projectId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "projectId is required",
              );
            }

            return handleRequest({
              apiKey: this.apiKey,
              projectId,
              name,
              description,
              stateId,
              teamIds,
              startDate,
              targetDate,
              progress,
              icon,
              color,
            });
          }
          case "get-linear-workflow-states": {
            const { handleRequest } = await import(
              "./requests/getWorkflowStatesHandler.js"
            );

            // Extract arguments
            const { teamId, teamKey } = request.params.arguments as {
              teamId?: string;
              teamKey?: string;
            };

            return handleRequest({
              apiKey: this.apiKey,
              teamId,
              teamKey,
            });
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`,
            );
        }
      },
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Linear MCP Server running on stdio");
  }
}

// Start the server
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error("LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

const server = new LinearMcpServer(apiKey);
server.run().catch((error: Error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
