import { ethers } from "ethers";

export interface SimulationResult {
  success: boolean;
  revertReason?: string;
  isTokenTransfer: boolean;
  tokenTransferDetails?: {
    recipient: string;
    amount: string;
  };
  gasEstimate?: string;
}

/**
 * Parses transaction data to check if it is a standard ERC-20 transfer(address,uint256) call.
 * Standard transfer signature hash: 0xa9059cbb
 * @param data Hex string of the transaction payload.
 */
export function parseTokenTransfer(data: string): { recipient: string; amount: string } | null {
  if (!data || data === "0x") return null;

  const hex = data.toLowerCase();
  // Check if call data starts with standard transfer selector (0xa9059cbb)
  if (hex.startsWith("0xa9059cbb") && hex.length >= 138) {
    try {
      // Decode address (next 32 bytes)
      const recipientHex = "0x" + hex.slice(34, 74);
      const recipient = ethers.getAddress(recipientHex);

      // Decode amount (next 32 bytes)
      const amountHex = "0x" + hex.slice(74, 138);
      const amount = BigInt(amountHex).toString();

      return {
        recipient,
        amount
      };
    } catch (error) {
      console.error("Failed to decode token transfer data:", error);
    }
  }

  return null;
}

/**
 * Simulates a transaction dry-run against the target contract using provider.call.
 * @param from The sender EVM address.
 * @param to The target contract or EOA.
 * @param value Native token value in Wei.
 * @param data Hex data payload.
 * @param provider Ethers provider.
 */
export async function simulateTransaction(
  from: string,
  to: string,
  value: string,
  data: string,
  provider: ethers.Provider
): Promise<SimulationResult> {
  const isTokenTransfer = data.startsWith("0xa9059cbb");
  const tokenTransferDetails = parseTokenTransfer(data) || undefined;

  const transactionRequest: ethers.TransactionRequest = {
    from,
    to,
    value: value ? BigInt(value) : undefined,
    data: data || undefined
  };

  try {
    // Attempt standard Gas Estimation to see if it reverts
    let gasEstimate: string | undefined;
    try {
      const gas = await provider.estimateGas(transactionRequest);
      gasEstimate = gas.toString();
    } catch (err) {
      // If estimateGas fails, the transaction is highly likely to revert.
      // We will capture this in the provider.call step.
    }

    // Call provider.call to get execution status and output
    const output = await provider.call(transactionRequest);

    return {
      success: true,
      isTokenTransfer,
      tokenTransferDetails,
      gasEstimate,
      revertReason: output === "0x" ? undefined : `Success (returned: ${output})`
    };
  } catch (error) {
    // Extract revert reason from standard JSON-RPC error
    let revertReason = "Unknown execution error";
    if (error instanceof Error) {
      revertReason = error.message;

      // Extract specific contract revert message if nested inside ethers errors
      const match = error.message.match(/revert(?:ed)?\s+with\s+reason\s+['"]([^'"]+)['"]/i);
      if (match && match[1]) {
        revertReason = match[1];
      }
    }

    return {
      success: false,
      isTokenTransfer,
      tokenTransferDetails,
      revertReason
    };
  }
}
