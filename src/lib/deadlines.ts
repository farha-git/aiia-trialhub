export type DeadlineStatus = "green" | "amber" | "red";

export function computeDueAt(startISO: string, windowHours: number) {
  return new Date(new Date(startISO).getTime() + windowHours * 60 * 60 * 1000).toISOString();
}

export function remainingMs(dueISO: string, now = new Date()) {
  return new Date(dueISO).getTime() - now.getTime();
}

export function statusFor(remaining: number, amberMs = 72 * 60 * 60 * 1000): DeadlineStatus {
  if (remaining < 0) return "red";
  if (remaining <= amberMs) return "amber";
  return "green";
}

export function formatRemaining(milliseconds: number) {
  const absoluteMinutes = Math.floor(Math.abs(milliseconds) / 60000);
  const days = Math.floor(absoluteMinutes / 1440);
  const hours = Math.floor((absoluteMinutes % 1440) / 60);
  const minutes = absoluteMinutes % 60;
  const value = days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
  return milliseconds < 0 ? `Overdue by ${value}` : `${value} left`;
}

export function calculateDeadline(occurredAt: string | undefined, windowHours: number, now = new Date(), amberWindowHours = 12) {
  if (!occurredAt) return null;
  const dueAt = computeDueAt(occurredAt, windowHours);
  const remaining = remainingMs(dueAt, now);
  return {
    dueAt,
    remainingMs: remaining,
    label: formatRemaining(remaining),
    status: statusFor(remaining, amberWindowHours * 60 * 60 * 1000),
  };
}
