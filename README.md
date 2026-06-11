# Agent Wallet Guard MCP Server

<p align="center">
  <img src="assets/logo.png" width="128" height="128" alt="Agent Wallet Guard Logo">
</p>
An institutional-grade Model Context Protocol (MCP) server that acts as an execution firewall for AI Agents. It provides prompt injection detection, recipient address auditing, spending limit guardrails, and EVM transaction dry-run simulations to secure autonomous wallets on the Pharos Network L1.

This tool is designed to prevent AI agents from executing unauthorized transactions due to prompt injection, model hallucinations, or interacting with malicious, unverified smart contracts.

---

## Capabilities and Tools

The server exposes four standard MCP tools:

### 1. `scan_prompt`
Scans incoming instructions or user prompts for injection patterns and malicious commands designed to hijack the agent or drain its wallet.
* **Input Parameters:**
  * `prompt` (string): The instruction text to scan.
* **Returns:**
  * `isSafe` (boolean): Verification result.
  * `reason` (string, optional): Explanatory reason if flagged.
  * `matchedKeywords` (array, optional): Found malicious patterns.

### 2. `audit_recipient`
Performs verification checks on target destination addresses before executing a transaction.
* **Input Parameters:**
  * `address` (string): The recipient EVM address.
* **Returns:**
  * `isValid` (boolean): Valid EVM address structure.
  * `isContract` (boolean): True if bytecode is deployed at this address.
  * `riskScore` (number): A score from 0 (safe EOA) to 100 (critical risk like ZeroAddress).
  * `reason` (string, optional): Summary of the evaluation.

### 3. `verify_safety_limits`
Tracks and regulates daily agent spend to prevent unlimited transaction drains.
* **Input Parameters:**
  * `amount` (number): The value of the proposed transaction.
  * `dailyLimit` (number, optional): Custom limit override. Defaults to value configured in env.
  * `commit` (boolean, optional): If true, registers and permanently records this spend amount. Defaults to false.
* **Returns:**
  * `allowed` (boolean): Compliance status.
  * `dailyLimit` (number): Configured daily max limit.
  * `spentToday` (number): Accumulated spend for the current day.
  * `remainingLimit` (number): Available balance remaining.

### 4. `simulate_transaction`
Executes an EVM dry-run via RPC to detect contract reverts, estimate gas, and decode ERC-20 transfer parameters.
* **Input Parameters:**
  * `from` (string): The sender address.
  * `to` (string): The target contract or recipient.
  * `value` (string, optional): Native token value in Wei (as a string). Defaults to "0".
  * `data` (string, optional): Hex transaction payload. Defaults to "0x".
* **Returns:**
  * `success` (boolean): Execution status.
  * `revertReason` (string, optional): Error message if simulation reverted.
  * `isTokenTransfer` (boolean): Indicates standard ERC-20 transfer.
  * `tokenTransferDetails` (object, optional): Decoded destination and amount if a transfer call.
  * `gasEstimate` (string, optional): Gas units required.

---

## Configuration

The server is configured using environment variables. Create a `.env` file in the root folder:

```env
# Pharos L1 Node RPC Provider URL
RPC_URL=https://atlantic.dplabs-internal.com

# Maximum spend amount per day (Reset every UTC midnight)
DAILY_LIMIT=1000
```

---

## Installation & Setup

1. **Clone and Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Server:**
   ```bash
   npm run build
   ```

3. **Start the Server:**
   ```bash
   npm run start
   ```

---

## Integration with MCP Clients

To integrate this firewall into an MCP-compliant client (such as Claude Desktop, Cursor, or LobeChat), register the server stdio configuration:

### Claude Desktop Configuration
Add the following to your `claude_desktop_config.json` configuration:

```json
{
  "mcpServers": {
    "agent-wallet-guard": {
      "command": "node",
      "args": ["/absolute/path/to/agent-wallet-guard/build/index.js"],
      "env": {
        "RPC_URL": "https://atlantic.dplabs-internal.com",
        "DAILY_LIMIT": "1000"
      }
    }
  }
}
```
