#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

declare const process: NodeJS.Process;

class LinearMcpServer {
  private server: Server;

  constructor() {
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
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "get-linear-tickets") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`,
        );
      }

      const { handleRequest } = await import(
        "./requests/getTicketsRequestHandler.js"
      );
      return handleRequest(
        request.params.arguments as {
          apiKey: string;
          status?: "active" | "completed" | "canceled";
          limit?: number;
        },
      );
    });
  }

  async run(): Promise<void> {
    //dotenv.config();
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error("LINEAR_API_KEY environment variable is required");
      process.exit(1);
    }
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Linear MCP Server running on stdio");
  }
}

// Start the server
const server = new LinearMcpServer();
server.run().catch((error: Error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
