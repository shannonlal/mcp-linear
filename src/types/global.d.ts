// Type declarations for external modules
declare module "@linear/sdk" {
  export interface User {
    id: string;
    name: string;
    email: string;
    fetch(): Promise<User>;
  }

  export interface Issue {
    id: string;
    title: string;
    description?: string;
    number: number;
    priority?: number;
    estimate?: number;
    dueDate?: string;
    teamId?: string;
    assigneeId?: string;
    stateId?: string;
    labelIds?: string[];
    createdAt: string;
    updatedAt: string;
    url: string;
    key?: string;
    team?: Team;
    fetch(): Promise<Issue>;
    update(data: Record<string, unknown>): Promise<Issue>;
  }

  export interface Team {
    id: string;
    name: string;
    key: string;
    fetch(): Promise<Team>;
  }

  export interface Project {
    id: string;
    name: string;
    description?: string;
    state?: string;
    teamIds?: string[];
    startDate?: string;
    targetDate?: string;
    progress?: number;
    updatedAt: string;
    url: string;
    fetch(): Promise<Project>;
    update(data: Record<string, unknown>): Promise<Project>;
  }

  export interface WorkflowState {
    id: string;
    name: string;
    type: string;
    fetch(): Promise<WorkflowState>;
  }

  export interface IssueLabel {
    id: string;
    name: string;
    color: string;
  }

  export interface IssueQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
    includeAssignee?: boolean;
    includeTeam?: boolean;
    includeState?: boolean;
    includeLabels?: boolean;
  }

  export interface ProjectQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
  }

  export interface UserQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
  }

  export interface TeamQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
  }

  export interface WorkflowStateQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
  }

  export interface IssueLabelQueryOptions {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    orderBy?: string;
  }

  export class LinearClient {
    constructor(options: { apiKey: string });

    // Custom GraphQL request method
    _request<T>(query: string, variables?: Record<string, unknown>): Promise<T>;

    // Issue methods
    issue(id: string): Promise<Issue>;
    issues(options?: IssueQueryOptions): Promise<{ nodes: Issue[] }>;
    updateIssue(
      id: string,
      data: Record<string, unknown>,
    ): Promise<{ success: boolean; issue: Issue }>;

    // Project methods
    project(id: string): Promise<Project>;
    projects(options?: ProjectQueryOptions): Promise<{ nodes: Project[] }>;
    updateProject(
      id: string,
      data: Record<string, unknown>,
    ): Promise<{ success: boolean; project: Project }>;

    // Team methods
    team(id: string): Promise<Team>;
    teams(options?: TeamQueryOptions): Promise<{ nodes: Team[] }>;

    // User methods
    user(id: string): Promise<User>;
    users(options?: UserQueryOptions): Promise<{ nodes: User[] }>;

    // Workflow methods
    workflowState(id: string): Promise<WorkflowState>;
    workflowStates(
      options?: WorkflowStateQueryOptions,
    ): Promise<{ nodes: WorkflowState[] }>;

    // Label methods
    issueLabels(
      options?: IssueLabelQueryOptions,
    ): Promise<{ nodes: IssueLabel[] }>;
  }

  export interface ProjectConnection {
    nodes: Project[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
    fetchNext(): Promise<ProjectConnection>;
    fetchPrevious(): Promise<ProjectConnection>;
  }

  export interface IssueConnection {
    nodes: Issue[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
    fetchNext(): Promise<IssueConnection>;
    fetchPrevious(): Promise<IssueConnection>;
  }

  export interface Organization {
    id: string;
    name: string;
    urlKey: string;
    createdAt: string;
    createdIssueCount: number;
    completedIssueCount: number;
    canceledIssueCount: number;
  }

  export type LinearFetch<T> = Promise<T>;
}

declare module "@modelcontextprotocol/sdk/server/index.js" {
  export class Server {
    constructor(
      identity: { name: string; version: string },
      options: { capabilities: { tools: Record<string, unknown> } },
    );

    setRequestHandler<T, R>(
      schema: unknown,
      handler: (request: T) => Promise<R> | R,
    ): void;

    connect(transport: unknown): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "@modelcontextprotocol/sdk/types.js" {
  export interface Request {
    method: string;
    params: Record<string, unknown>;
  }

  export const CallToolRequestSchema: unknown;
  export const ListToolsRequestSchema: unknown;

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
  }

  export enum ErrorCode {
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "vitest" {
  type Awaitable<T> = T | Promise<T>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    // Add other assertion methods as needed
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface AsyncAssertion {
    toThrow(expected?: unknown): Promise<void>;
    // Add other async assertion methods as needed
  }

  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => Awaitable<void>): void;
  export function beforeEach(fn: () => Awaitable<void>): void;

  export const expect: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T>(actual: T): Assertion<T>;
    objectContaining<T>(expected: Partial<T>): T;
  } & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T>(actual: Promise<T>): AsyncAssertion;
  };

  export const vi: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn<T extends (...args: any[]) => any>(): jest.Mock<
      ReturnType<T>,
      Parameters<T>
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mock(path: string, factory?: () => unknown): void;
    clearAllMocks(): void;
  };

  export type Mock = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockImplementation(factory: () => unknown): Mock;
  };

  // Add Jest.Mock type to support TS checking
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Mock<TReturn = any, TArgs extends any[] = any[]> {
      (...args: TArgs): TReturn;
      mockImplementation: (
        implementation?: (...args: TArgs) => TReturn,
      ) => Mock<TReturn, TArgs>;
      mockReturnValue: (value: TReturn) => Mock<TReturn, TArgs>;
      mockResolvedValue: (value: Awaited<TReturn>) => Mock<TReturn, TArgs>;
      mockRejectedValue: (value: unknown) => Mock<TReturn, TArgs>;
    }
  }
}

declare namespace Chai {
  interface AsyncAssertion {
    // ... existing code ...
  }
}
