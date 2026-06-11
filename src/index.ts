import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";

import { scanPrompt } from "./utils/security.js";

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
    tools: [
      {
        name: "scan_prompt",
        description: "Scans user instructions or prompts for security threats, prompt injection overrides, or unauthorized balance-sweeping commands.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt or instruction string to scan for malicious injects.",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// Register Tool Invocation Request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "scan_prompt") {
    if (!args || typeof args.prompt !== "string") {
      throw new Error("Missing prompt parameter");
    }
    const result = scanPrompt(args.prompt);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  throw new Error(`Tool ${name} not implemented.`);
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
