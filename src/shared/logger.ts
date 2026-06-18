import winston from "winston";

export const logger =
  winston.createLogger({

    level: "info",

    format:
      winston.format.combine(
        winston.format.timestamp({
          format: () => new Date().toISOString()
        }),
        winston.format.printf(
          ({ timestamp, level, message }) =>
            `${timestamp} ${level}: ${message}`
        )
      ),

    transports: [
      new winston.transports.Console(),

      new winston.transports.File({
        filename: "logs/app.log"
      })
    ]
  });
