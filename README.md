# Linear MCP

A Model Context Protocol (MCP) extension for integrating with the Linear API.

## Features

- **Get Linear Tickets**: Retrieve tickets from Linear API for the authenticated user
- **Get Linear Projects**: Get projects from Linear API
- **Get Linear Ticket by ID**: Get detailed information about a specific Linear ticket
- **Update Linear Ticket**: Update information for a specific Linear ticket
- **Update Linear Project**: Update information for a specific Linear project

## Setup

### Prerequisites

- Node.js (v18 or higher)
- A Linear account and API key

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the MCP:

```bash
npm run build
```

### Configuration

1. Create a Linear API key:

   - Go to your Linear account settings
   - Navigate to "API" section
   - Create a new personal API key
   - Copy the generated key

2. Configure MCP in Cursor:
   - Open Cursor's settings
   - Navigate to the MCP section
   - Add a new MCP with the following configuration:
     - **Name**: Linear MCP
     - **Command**: `/path/to/repo/build/server/index.js`
     - **Environment Variables**: Add `LINEAR_API_KEY=your_api_key_here`

## Usage

### Get Linear Tickets

Retrieve tickets assigned to the authenticated user.

Parameters:

- `status` (optional): Filter tickets by status ("active", "completed", "canceled")
- `limit` (optional): Maximum number of tickets to return (default: 10, max: 50)

### Get Linear Projects

Retrieve projects from Linear.

Parameters:

- `search` (optional): Search term to find specific projects
- `status` (optional): Filter projects by status ("planned", "started", "paused", "completed", "canceled")
- `limit` (optional): Maximum number of projects to return (default: 10, max: 50)

### Get Linear Ticket by ID

Get detailed information about a specific ticket.

Parameters:

- `ticketId` (required): The ID or key of the ticket (e.g., "PLA-524" or "29ede43e806c")

### Update Linear Ticket

Update information for a specific ticket.

Parameters:

- `ticketId` (required): The ID or key of the ticket to update
- `title` (optional): New title for the ticket
- `description` (optional): New description for the ticket
- `stateId` (optional): ID of the state to set for the ticket
- `assigneeId` (optional): ID of the user to assign the ticket to
- `priority` (optional): Priority level (0-4)
- `dueDate` (optional): Due date in ISO format (YYYY-MM-DD)
- `estimate` (optional): Estimate in points

### Update Linear Project

Update information for a specific project.

Parameters:

- `projectId` (required): The ID of the project to update
- `name` (optional): New name for the project
- `description` (optional): New description for the project
- `stateId` (optional): ID of the state to set for the project
- `teamIds` (optional): IDs of teams associated with the project
- `startDate` (optional): Start date in ISO format (YYYY-MM-DD)
- `targetDate` (optional): Target date in ISO format (YYYY-MM-DD)
- `progress` (optional): Progress percentage (0-1)
- `icon` (optional): Icon for the project
- `color` (optional): Color for the project

## Development

### Available Scripts

- `npm run build` - Build the MCP
- `npm run start` - Run the MCP (requires LINEAR_API_KEY environment variable)
- `npm run clean` - Clean the build directory
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests

## License

MIT

## Note

This MCP was updated on March 30, 2025.
