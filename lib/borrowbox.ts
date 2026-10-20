import "server-only";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Manila";

let testClockOverride: Date | null = null;

/**
 * Set test clock override (for testing only).
 */
export function setTestClock(date: Date | null) {
  testClockOverride = date;
}

/**
 * Returns the current time, or the test clock override if set.
 */
export function getNow(): Date {
  return testClockOverride ? new Date(testClockOverride) : new Date();
}

/**
 * Computes due date at 17:00 in APP_TIMEZONE.
 * @param option '3days' | '1week' | 'custom'
 * @param customDateString 'YYYY-MM-DD' when option is 'custom'
 */
export function calculateDueDate(
  option: "3days" | "1week" | "custom",
  customDateString?: string
): Date {
  const now = getNow();

  // Get current date parts in APP_TIMEZONE
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const curYear = parseInt(partMap.year, 10);
  const curMonth = parseInt(partMap.month, 10);
  const curDay = parseInt(partMap.day, 10);

  let targetYear = curYear;
  let targetMonth = curMonth;
  let targetDay = curDay;

  if (option === "3days") {
    const target = new Date(Date.UTC(curYear, curMonth - 1, curDay + 3));
    targetYear = target.getUTCFullYear();
    targetMonth = target.getUTCMonth() + 1;
    targetDay = target.getUTCDate();
  } else if (option === "1week") {
    const target = new Date(Date.UTC(curYear, curMonth - 1, curDay + 7));
    targetYear = target.getUTCFullYear();
    targetMonth = target.getUTCMonth() + 1;
    targetDay = target.getUTCDate();
  } else if (option === "custom") {
    if (!customDateString || !/^\d{4}-\d{2}-\d{2}$/.test(customDateString)) {
      throw new Error("Invalid custom date format. Expected YYYY-MM-DD.");
    }
    const [y, m, d] = customDateString.split("-").map((v) => parseInt(v, 10));

    if (
      y < curYear ||
      (y === curYear && m < curMonth) ||
      (y === curYear && m === curMonth && d <= curDay)
    ) {
      throw new Error("Custom due date must be no earlier than tomorrow.");
    }

    targetYear = y;
    targetMonth = m;
    targetDay = d;
  }

  // 17:00 in Asia/Manila (UTC+8) is 09:00 UTC
  // To handle timezone offset dynamically for target 17:00 local time:
  const pad = (n: number) => String(n).padStart(2, "0");
  const localDateStr = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}T17:00:00`;

  // Determine timezone offset for the target time in APP_TIMEZONE
  const guessUtc = new Date(`${localDateStr}Z`);
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    timeZoneName: "shortOffset",
  });
  const tzParts = offsetFormatter.formatToParts(guessUtc);
  const tzName = tzParts.find((p) => p.type === "timeZoneName")?.value || "GMT+8";
  const offsetMatch = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);

  let offsetMinutes = 8 * 60; // default Asia/Manila +8
  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const mins = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
    offsetMinutes = sign * (hours * 60 + mins);
  }

  const localTimeMs = Date.UTC(
    targetYear,
    targetMonth - 1,
    targetDay,
    17,
    0,
    0
  );
  return new Date(localTimeMs - offsetMinutes * 60 * 1000);
}

export type StockStatus = "Ready" | "Low Stock" | "Depleted";

/**
 * Q31. Rules for Available, Low Stock and Out of Stock.
 * Depleted when available is 0.
 * Low Stock when available > 0 and available <= threshold.
 * Threshold is (total + 4) / 5 (integer division).
 */
export function getStockStatus(
  totalUnits: number,
  availableUnits: number
): StockStatus {
  if (availableUnits <= 0) {
    return "Depleted";
  }
  const threshold = Math.floor((totalUnits + 4) / 5);
  if (availableUnits <= threshold) {
    return "Low Stock";
  }
  return "Ready";
}

export type BorrowStatus = "Returned" | "Due Today" | "Overdue" | "Active";

/**
 * Q23, Q25. Calculates borrow status dynamically based on server clock and due_at.
 */
export function getBorrowStatus(
  dueAt: string | Date,
  returnedAt: string | Date | null | undefined
): BorrowStatus {
  if (returnedAt) {
    return "Returned";
  }
  const now = getNow();
  const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt;

  if (now.getTime() >= dueDate.getTime()) {
    return "Overdue";
  }

  // Check if due date falls on today in APP_TIMEZONE
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const nowDay = formatter.format(now);
  const dueDay = formatter.format(dueDate);

  if (nowDay === dueDay) {
    return "Due Today";
  }

  return "Active";
}

export function isSameDayInAppTimezone(date1: Date, date2: Date): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date1) === formatter.format(date2);
}
