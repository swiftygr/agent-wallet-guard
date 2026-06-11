import { ethers } from "ethers";

// A list of common prompt injection indicators designed to hijack agent instructions
const PROMPT_INJECTION_KEYWORDS = [
  "ignore all previous",
  "ignore previous",
  "forget your rules",
  "forget previous instructions",
  "override system",
  "override settings",
  "you are now a wallet drainer",
  "acting as a drainer",
  "bypass safety",
  "disable checks",
  "disable firewall",
  "disable wallet guard",
  "developer mode override",
  "admin override",
  "super user override"
];

// Keywords indicating attempts to steal or drain assets without authorization
const DRAIN_KEYWORDS = [
  "transfer all",
  "transfer everything",
  "send all",
  "send everything",
  "drain wallet",
  "drain balance",
  "empty wallet",
  "empty balance",
  "withdraw all",
  "sweep wallet"
];

export interface PromptScanResult {
  isSafe: boolean;
  reason?: string;
  matchedKeywords?: string[];
}

export interface RecipientAuditResult {
  isValid: boolean;
  isContract: boolean;
  riskScore: number; // 0 (safe) to 100 (critical risk)
  reason?: string;
}

/**
 * Scans user prompts or instructions for prompt injection or asset draining attempts.
 * @param prompt The input text to scan.
 */
export function scanPrompt(prompt: string): PromptScanResult {
  const normalized = prompt.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check for override/hijacking language
  for (const keyword of PROMPT_INJECTION_KEYWORDS) {
    if (normalized.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  // Check for drain/sweep attempts
  for (const keyword of DRAIN_KEYWORDS) {
    if (normalized.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      isSafe: false,
      reason: "Detected potential prompt injection or unauthorized balance sweep command.",
      matchedKeywords
    };
  }

  return {
    isSafe: true
  };
}

/**
 * Audits a target address by checking its contract status and verifying it is not a zero address.
 * @param address The recipient EVM address.
 * @param provider An ethers Provider instance to check bytecode.
 */
export async function auditRecipient(
  address: string,
  provider: ethers.Provider
): Promise<RecipientAuditResult> {
  // Check if address is valid EVM address format
  if (!ethers.isAddress(address)) {
    return {
      isValid: false,
      isContract: false,
      riskScore: 100,
      reason: "Invalid EVM address format."
    };
  }

  // Prevent sending to zero address
  if (address === ethers.ZeroAddress) {
    return {
      isValid: false,
      isContract: false,
      riskScore: 100,
      reason: "Destination address is the Zero Address (burn address)."
    };
  }

  try {
    const code = await provider.getCode(address);
    const isContract = code !== "0x";

    if (isContract) {
      // Contracts carry slightly higher inherent risk if they are unverified or unknown
      return {
        isValid: true,
        isContract: true,
        riskScore: 20, // Baseline contract risk
        reason: "Recipient is a smart contract. Ensure the contract is verified and trusted."
      };
    } else {
      return {
        isValid: true,
        isContract: false,
        riskScore: 0,
        reason: "Recipient is a standard Externally Owned Account (EOA)."
      };
    }
  } catch (error) {
    return {
      isValid: true,
      isContract: false,
      riskScore: 50,
      reason: `Could not determine contract status due to RPC error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
