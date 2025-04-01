import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GetProjectsArgs {
  apiKey: string;
  search?: string;
  status?: string;
  limit?: number;
}

export interface ProjectListResponse {
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    status: string;
    startDate?: string;
    targetDate?: string;
    progress?: number;
    url: string;
  }>;
  total: number;
}

/**
 * Handler for retrieving projects from Linear
 */
export async function handleRequest(
  args: GetProjectsArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    if (!args.apiKey) {
      throw new McpError(ErrorCode.InvalidParams, "API key is required");
    }

    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    // Prepare filter
    const filter: Record<string, unknown> = {};

    // Add status filter if provided
    if (args.status) {
      // Map status names to Linear's state types
      const statusMap: Record<string, string> = {
        planned: "planned",
        started: "started",
        paused: "paused",
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

    // Get projects from Linear
    let projects;

    if (args.search) {
      // For search, we need to use a different approach
      // Ideally the search term should be applied directly to the projects query
      // but for simplicity we'll get all projects and filter afterwards
      projects = await linearClient.projects({
        first: limit * 2, // Get more results to allow for filtering
      });

      // Filter projects by name/description matching search term
      const searchTerm = args.search.toLowerCase();
      projects.nodes = projects.nodes
        .filter((project) => {
          const nameMatch = project.name.toLowerCase().includes(searchTerm);
          const descMatch = project.description
            ? project.description.toLowerCase().includes(searchTerm)
            : false;
          return nameMatch || descMatch;
        })
        .slice(0, limit);
    } else {
      // Normal query with filters
      projects = await linearClient.projects({
        filter,
        first: limit,
      });
    }

    // Format projects
    const formattedProjects = await Promise.all(
      projects.nodes.map(async (project) => {
        // Default status name
        let statusName = "Unknown";

        // Instead of casting, we'll just use the project's state directly
        if (project.state) {
          statusName = String(project.state);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: statusName,
          startDate: project.startDate,
          targetDate: project.targetDate,
          progress: project.progress,
          url: project.url,
        };
      }),
    );

    const responseData = {
      projects: formattedProjects,
      total: formattedProjects.length,
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

    console.error("Error fetching projects:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch Linear projects: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
