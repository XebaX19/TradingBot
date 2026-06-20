import { setLoggerLevel } from "../shared/logger";

const VALID_LEVELS = new Set([
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly"
]);

export function configureScriptLogging(
  value: unknown,
  fallback: string
) {
  const level =
    typeof value === "string" &&
    value.trim() !== ""
      ? value.trim().toLowerCase()
      : fallback;

  if (!VALID_LEVELS.has(level)) {
    throw new Error(
      `Invalid log level: ${level}`
    );
  }

  setLoggerLevel(level);

  return level;
}
