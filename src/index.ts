import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";

import { scanPrompt, auditRecipient } from "./utils/security.js";
import { checkSpendLimit, recordSpend } from "./utils/storage.js";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "https://rpc.testnet.pharosnetwork.xyz/";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const DEFAULT_DAILY_LIMIT = Number(process.env.DAILY_LIMIT || "1000");

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
      {
        name: "audit_recipient",
        description: "Audits a recipient EVM address to check validity and verify if it is a smart contract (which carries higher execution risk) or a standard EOA.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The recipient EVM address to inspect.",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "verify_safety_limits",
        description: "Checks if a proposed spend amount complies with the daily spending limits. Can commit the spend or perform a dry-run check.",
        inputSchema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description: "The value/amount to check or record against the limit.",
            },
            dailyLimit: {
              type: "number",
              description: "Optional daily limit override. Defaults to value set in environment configuration.",
            },
            commit: {
              type: "boolean",
              description: "If true, registers and saves the spend amount. If false, executes a dry-run check only.",
            },
          },
          required: ["amount"],
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

  if (name === "audit_recipient") {
    if (!args || typeof args.address !== "string") {
      throw new Error("Missing address parameter");
    }
    const result = await auditRecipient(args.address, provider);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (name === "verify_safety_limits") {
    if (!args || typeof args.amount !== "number") {
      throw new Error("Missing amount parameter");
    }
    const amount = args.amount;
    const dailyLimit = typeof args.dailyLimit === "number" ? args.dailyLimit : DEFAULT_DAILY_LIMIT;
    const commit = typeof args.commit === "boolean" ? args.commit : false;

    const result = checkSpendLimit(amount, dailyLimit);

    if (result.allowed && commit) {
      recordSpend(amount);
    }

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
