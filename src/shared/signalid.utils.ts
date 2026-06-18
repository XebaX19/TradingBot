export function generateSignalId(
  symbol: string,
  strategy: string,
  timestamp: Date
): string {
  const date = 
    timestamp
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

  return `${symbol}-${strategy}-${date}`;
}
