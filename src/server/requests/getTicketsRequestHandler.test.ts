import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinearClient, User } from "@linear/sdk";
import type { IssueConnection } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { handleRequest } from "./getTicketsRequestHandler.js";

// Mock Linear SDK
vi.mock("@linear/sdk", () => ({
  LinearClient: vi.fn(() => ({
    viewer: vi.fn(),
  })),
}));

// Create type-safe mock
const MockLinearClient = vi.mocked(LinearClient);

describe("getTicketsRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error if no API key is provided", async () => {
    // @ts-expect-error - Testing invalid input
    await expect(handleRequest({})).rejects.toThrow(
      new McpError(ErrorCode.InvalidParams, "API key is required"),
    );
  });

  it("should return appropriate message when no issues are found", async () => {
    // Mock Linear client to return empty issues list
    const mockIssueConnection: Partial<IssueConnection> = {
      nodes: [],
    };

    const mockUser = {
      assignedIssues: vi.fn().mockResolvedValue(mockIssueConnection),
    } as unknown as User;

    MockLinearClient.mockImplementation(
      () =>
        ({
          viewer: Promise.resolve(mockUser),
        }) as unknown as LinearClient,
    );

    const result = await handleRequest({ apiKey: "test-key" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "No tickets found matching the criteria.",
        },
      ],
    });
  });

  it("should handle unexpected errors properly", async () => {
    // Mock Linear client to throw an error
    const mockError = new Error("Unexpected API error");
    MockLinearClient.mockImplementation(
      () =>
        ({
          viewer: Promise.reject(mockError),
        }) as unknown as LinearClient,
    );

    await expect(handleRequest({ apiKey: "test-key" })).rejects.toThrow(
      new McpError(
        ErrorCode.InternalError,
        "Failed to fetch Linear tickets: Unexpected API error",
      ),
    );
  });
});
