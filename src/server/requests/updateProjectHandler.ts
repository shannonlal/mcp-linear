import { LinearClient } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface UpdateProjectArgs {
  apiKey: string;
  projectId: string;
  name?: string;
  description?: string;
  stateId?: string;
  teamIds?: string[];
  startDate?: string;
  targetDate?: string;
  progress?: number;
  icon?: string;
  color?: string;
}

export interface UpdateProjectResponse {
  success: boolean;
  message: string;
  project: {
    id: string;
    name: string;
    description?: string;
    state?: string;
    teams: Array<{ id: string; name: string; key: string }>;
    startDate?: string;
    targetDate?: string;
    progress?: number;
    updatedAt: string;
    url: string;
  };
}

/**
 * Handler for updating a specific project
 */
export async function handleRequest(
  args: UpdateProjectArgs,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Validate API key
  if (!args.apiKey) {
    throw new McpError(ErrorCode.InvalidParams, "Linear API key is required");
  }

  // Validate project ID
  if (!args.projectId) {
    throw new McpError(ErrorCode.InvalidParams, "Project ID is required");
  }

  // Check if there's at least one field to update
  const updateFields = [
    "name",
    "description",
    "stateId",
    "teamIds",
    "startDate",
    "targetDate",
    "progress",
    "icon",
    "color",
  ];

  const hasUpdateField = updateFields.some(
    (field) => args[field as keyof UpdateProjectArgs] !== undefined,
  );

  if (!hasUpdateField) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "At least one field to update is required",
    );
  }

  // Validate progress if provided
  if (args.progress !== undefined && (args.progress < 0 || args.progress > 1)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Progress must be between 0 and 1",
    );
  }

  try {
    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: args.apiKey,
    });

    // Prepare update payload
    const updateData: Record<string, unknown> = {};

    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.stateId !== undefined) updateData.stateId = args.stateId;
    if (args.teamIds !== undefined) updateData.teamIds = args.teamIds;
    if (args.startDate !== undefined) updateData.startDate = args.startDate;
    if (args.targetDate !== undefined) updateData.targetDate = args.targetDate;
    if (args.progress !== undefined) updateData.progress = args.progress;
    if (args.icon !== undefined) updateData.icon = args.icon;
    if (args.color !== undefined) updateData.color = args.color;

    // Find projects matching the ID
    const projects = await linearClient.projects({
      filter: {
        id: {
          eq: args.projectId,
        },
      },
    });

    if (projects.nodes.length === 0) {
      throw new McpError(
        ErrorCode.InternalError,
        `Project not found: ${args.projectId}`,
      );
    }

    const project = projects.nodes[0];

    // Update the project
    const updateResult = await linearClient.updateProject(
      project.id,
      updateData,
    );

    if (!updateResult.success) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project: ${args.projectId}`,
      );
    }

    // Get the updated project
    const updatedProject = updateResult.project;

    // Fetch teams data
    let teams: Array<{ id: string; name: string; key: string }> = [];
    if (updatedProject.teamIds && updatedProject.teamIds.length > 0) {
      try {
        const teamsPromises = updatedProject.teamIds.map(
          async (teamId: string) => {
            const teamResult = await linearClient.teams({
              filter: {
                id: {
                  eq: teamId,
                },
              },
            });

            if (teamResult && teamResult.nodes.length > 0) {
              const teamData = teamResult.nodes[0];
              return {
                id: teamData.id,
                name: teamData.name || "Unknown",
                key: teamData.key || "TEAM",
              };
            }
            return null;
          },
        );

        const teamResults = await Promise.all(teamsPromises);
        teams = teamResults.filter(
          (t): t is { id: string; name: string; key: string } => t !== null,
        );
      } catch (error) {
        console.warn("Error fetching teams:", error);
      }
    }

    // Format the response data
    const responseData = {
      success: true,
      message: "Project updated successfully",
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        state: updatedProject.state,
        teams,
        startDate: updatedProject.startDate,
        targetDate: updatedProject.targetDate,
        progress: updatedProject.progress,
        updatedAt: updatedProject.updatedAt,
        url: updatedProject.url,
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

    console.error("Error updating project:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to update project: ${(error as Error).message}`,
    );
  }
}
