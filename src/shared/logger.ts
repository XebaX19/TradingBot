import winston from "winston";
import { env } from "../config/env";

export const logger =
  winston.createLogger({

    level: env.logging.level,

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
