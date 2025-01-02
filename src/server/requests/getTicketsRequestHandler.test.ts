import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  LinearClient,
  User,
  IssueConnection,
  Organization,
  Team,
} from "@linear/sdk";
import type { LinearFetch } from "@linear/sdk";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { handleRequest } from "./getTicketsRequestHandler";

// Mock Linear SDK
vi.mock("@linear/sdk", () => ({
  LinearClient: vi.fn().mockImplementation(() => ({
    viewer: vi.fn(),
  })),
}));

// Get the mock constructor
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MockLinearClient = LinearClient as unknown as Mock<typeof LinearClient>;

describe("getTicketsRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error if no API key is provided", async () => {
    // @ts-expect-error - Testing invalid input
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await expect(handleRequest({})).rejects.toThrow(
      new McpError(ErrorCode.InvalidParams, "API key is required"),
    );
  });

  it("should return appropriate message when no issues are found", async () => {
    // Mock Linear client to return empty issues list
    const mockIssueConnection: Partial<IssueConnection> = {
      nodes: [],
    };

    const mockAssignedIssues = vi.fn().mockResolvedValue(mockIssueConnection);
    const now = new Date();

    // Create a mock User with required properties
    const mockUser = {
      id: "test-user",
      name: "Test User",
      email: "test@example.com",
      active: true,
      admin: false,
      assignedIssues: mockAssignedIssues,
      createdAt: now,
      updatedAt: now,
      displayName: "Test User",
      avatarUrl: "test-url",
      avatarBackgroundColor: "#000000",
      createdIssueCount: 0,
      disableReason: undefined,
      guest: false,
      isMe: true,
      lastSeen: now,
      organization: Promise.resolve({
        id: "test-org",
        name: "Test Org",
      }) as LinearFetch<Organization>,
      statusEmoji: undefined,
      statusLabel: undefined,
      statusUntilAt: undefined,
      teamIds: ["test-team"],
      teams: (() => Promise.resolve({ nodes: [] as Team[] })) as User["teams"],
      timezone: "UTC",
      url: "test-url",
    } as Partial<User>;

    const mockViewer = Promise.resolve(mockUser) as LinearFetch<User>;
    const mockClient = {
      viewer: mockViewer,
      options: {},
    } as LinearClient;

    MockLinearClient.mockImplementation(() => mockClient);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
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
    const mockViewer = Promise.reject(mockError) as LinearFetch<User>;
    const mockClient = {
      viewer: mockViewer,
      options: {},
    } as LinearClient;

    MockLinearClient.mockImplementation(() => mockClient);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await expect(handleRequest({ apiKey: "test-key" })).rejects.toThrow(
      new McpError(
        ErrorCode.InternalError,
        "Failed to fetch Linear tickets: Unexpected API error",
      ),
    );
  });
});
