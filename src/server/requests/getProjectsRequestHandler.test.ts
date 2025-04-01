/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { LinearClient, ProjectConnection } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { handleRequest } from "./getProjectsRequestHandler";

// Mock function type for vitest
interface MockFunction<TResult, TArgs extends any[]> {
  (...args: TArgs): TResult;
  mockResolvedValue(value: Awaited<TResult>): MockFunction<TResult, TArgs>;
  mockRejectedValue(value: unknown): MockFunction<TResult, TArgs>;
}

// Mock types for better type-checking in tests
type MockedLinearClient = {
  projects: MockFunction<
    Promise<Partial<ProjectConnection>>,
    [Record<string, unknown>?]
  >;
  searchProjects: MockFunction<
    Promise<{ projects: Partial<ProjectConnection> }>,
    [Record<string, unknown>]
  >;
};

// Mock Linear SDK
vi.mock("@linear/sdk", () => ({
  LinearClient: vi.fn().mockImplementation(() => ({
    projects: vi.fn(),
    searchProjects: vi.fn(),
  })),
}));

// Get the mock constructor
const MockLinearClient = LinearClient as unknown as Mock;

describe("getProjectsRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error if no API key is provided", async () => {
    const promise = handleRequest({} as any);
    await expect(promise).rejects.toThrow(
      new McpError(ErrorCode.InvalidParams, "API key is required"),
    );
  });

  it("should return appropriate message when no projects are found", async () => {
    // Mock Linear client to return empty projects list
    const mockProjectConnection: Partial<ProjectConnection> = {
      nodes: [],
    };

    const mockClient = {
      projects: vi.fn().mockResolvedValue(mockProjectConnection),
      searchProjects: vi.fn(),
    } as unknown as MockedLinearClient;

    MockLinearClient.mockImplementation(() => mockClient);

    const result = await handleRequest({ apiKey: "test-key" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "No projects found matching the criteria.",
        },
      ],
    });
  });

  it("should handle searching for projects", async () => {
    // Create mock project
    const now = new Date();
    const mockProject = {
      id: "proj-123",
      name: "Test Project",
      description: "A test project",
      state: Promise.resolve({ name: "Started" }),
      team: Promise.resolve({ name: "Engineering" }),
      url: "https://linear.app/test/project/test-project",
      startDate: now.toISOString(),
      targetDate: new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 days later
      progress: 0.5,
      createdAt: now.toISOString(),
    };

    // Mock search result
    const mockSearchResult = {
      projects: {
        nodes: [mockProject],
      },
    };

    const mockClient = {
      projects: vi.fn(),
      searchProjects: vi.fn().mockResolvedValue(mockSearchResult),
    } as unknown as MockedLinearClient;

    MockLinearClient.mockImplementation(() => mockClient);

    const result = await handleRequest({ apiKey: "test-key", search: "test" });

    expect(mockClient.searchProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        term: "test",
        first: 10,
      }) as any,
    );

    expect(result.content[0].type).toBe("text");
    const parsedResults = JSON.parse(result.content[0].text) as Array<
      Record<string, unknown>
    >;
    expect(parsedResults).toHaveLength(1);
    expect(parsedResults[0].id).toBe("proj-123");
    expect(parsedResults[0].name).toBe("Test Project");
  });

  it("should handle unexpected errors properly", async () => {
    // Mock Linear client to throw an error
    const mockError = new Error("Unexpected API error");

    const mockClient = {
      projects: vi.fn().mockRejectedValue(mockError),
      searchProjects: vi.fn(),
    } as unknown as MockedLinearClient;

    MockLinearClient.mockImplementation(() => mockClient);

    const promise = handleRequest({ apiKey: "test-key" });
    await expect(promise).rejects.toThrow(
      new McpError(
        ErrorCode.InternalError,
        "Failed to fetch Linear projects: Unexpected API error",
      ),
    );
  });
});
