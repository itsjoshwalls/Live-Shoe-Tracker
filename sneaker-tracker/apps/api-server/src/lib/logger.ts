import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Detect serverless/ephemeral environments (e.g., Vercel) where filesystem is read-only
const isServerless = !!process.env.VERCEL || process.env.NOW_REGION !== undefined;

// Determine a writable logs directory if file logging is enabled
const enableFileLogs = (process.env.ENABLE_FILE_LOGS || '').toLowerCase() === 'true';
const defaultLogsDir = 'logs';
const serverlessLogsDir = path.join('/tmp', 'logs');
const logsDir = isServerless ? serverlessLogsDir : defaultLogsDir;

let fileTransports: winston.transport[] = [];
if (enableFileLogs) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fileTransports = [
      new winston.transports.File({ filename: 'error.log', level: 'error', dirname: logsDir }),
      new winston.transports.File({ filename: 'combined.log', dirname: logsDir })
    ];
  } catch {
    // If we cannot create or write to the directory, skip file transports
    fileTransports = [];
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    ...fileTransports
  ]
});

export default logger;