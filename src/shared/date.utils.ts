export function generateHourlyRange(
  from: Date,
  to: Date
): Date[] {

  const result: Date[] = [];

  let current =
    new Date(from);

  while (current <= to) {
    result.push(
      new Date(current)
    );

    current.setHours(
      current.getHours() + 1
    );
  }

  return result;
}

export function getIntervalMs(interval: string) {
  const match = /^(\d+)([mhdw])$/.exec(interval);

  if (!match) {
    throw new Error(`Unsupported interval: ${interval}`);
  }

  const [, amount, unit] = match;
  const value = Number(amount);

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported interval: ${interval}`);
  }
}

export function getLastClosedCandleOpenTimeUtc(now: Date, interval: string) {
  const intervalMs = getIntervalMs(interval);
  const currentIntervalStart = Math.floor(now.getTime() / intervalMs) * intervalMs;
  const lastClosedOpenTime = currentIntervalStart - intervalMs;

  return new Date(lastClosedOpenTime);
}

export function clampToLastClosedCandleUtc(to: Date, now: Date, interval: string) {
  const lastClosedCandleOpenTime =
    getLastClosedCandleOpenTimeUtc(now, interval);

  return to < lastClosedCandleOpenTime
    ? to
    : lastClosedCandleOpenTime;
}
