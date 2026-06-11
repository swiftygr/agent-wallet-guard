import fs from "fs";
import path from "path";

export interface LimitState {
  date: string;
  spentToday: number;
}

const LIMITS_FILE = path.resolve(process.cwd(), "limits.json");

/**
 * Gets the current UTC date in YYYY-MM-DD format.
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Reads the current limit tracking state from the local storage file.
 */
export function getLimitState(): LimitState {
  try {
    if (fs.existsSync(LIMITS_FILE)) {
      const data = fs.readFileSync(LIMITS_FILE, "utf-8");
      const state = JSON.parse(data) as LimitState;
      const today = getTodayDateString();

      // If the stored state is from a previous day, reset spentToday
      if (state.date !== today) {
        return {
          date: today,
          spentToday: 0
        };
      }
      return state;
    }
  } catch (error) {
    console.error("Error reading limits file, returning default state:", error);
  }

  return {
    date: getTodayDateString(),
    spentToday: 0
  };
}

/**
 * Writes the limit tracking state to the local storage file.
 * @param state The state to save.
 */
export function saveLimitState(state: LimitState): void {
  try {
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing limits file:", error);
  }
}

export interface SpendCheckResult {
  allowed: boolean;
  dailyLimit: number;
  spentToday: number;
  remainingLimit: number;
  reason?: string;
}

/**
 * Checks if a requested spend amount falls within the daily limit.
 * Does not mutate the stored value.
 * @param amount The value to check.
 * @param dailyLimit The daily maximum spending limit.
 */
export function checkSpendLimit(amount: number, dailyLimit: number): SpendCheckResult {
  const state = getLimitState();
  const projectedSpend = state.spentToday + amount;
  const remaining = dailyLimit - state.spentToday;

  if (projectedSpend > dailyLimit) {
    return {
      allowed: false,
      dailyLimit,
      spentToday: state.spentToday,
      remainingLimit: remaining,
      reason: `Spending limit exceeded. Requested: ${amount}. Remaining limit: ${remaining}.`
    };
  }

  return {
    allowed: true,
    dailyLimit,
    spentToday: state.spentToday,
    remainingLimit: remaining
  };
}

/**
 * Records a successful spend transaction, updating the storage state.
 * @param amount The transaction value to register.
 */
export function recordSpend(amount: number): void {
  const state = getLimitState();
  state.spentToday += amount;
  saveLimitState(state);
}
