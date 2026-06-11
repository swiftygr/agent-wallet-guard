import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";

const server = new Server(
  {
    name: "agent-wallet-guard",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tool Listing Request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [],
  };
});

// Register Tool Invocation Request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  throw new Error(`Tool ${request.params.name} not implemented.`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Wallet Guard MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
