type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

class JsonLogger {
  constructor(private readonly context: LogFields = {}) {}

  child(fields: LogFields) {
    return new JsonLogger({ ...this.context, ...fields });
  }

  private write(level: LogLevel, message: string, fields?: LogFields) {
    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...(fields ?? {}),
    };

    const line = JSON.stringify(payload);

    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  debug(message: string, fields?: LogFields) {
    this.write("debug", message, fields);
  }

  info(message: string, fields?: LogFields) {
    this.write("info", message, fields);
  }

  warn(message: string, fields?: LogFields) {
    this.write("warn", message, fields);
  }

  error(message: string, fields?: LogFields) {
    this.write("error", message, fields);
  }
}

export const logger = new JsonLogger();
export type { LogFields };