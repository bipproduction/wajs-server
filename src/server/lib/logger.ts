// src/lib/logger.ts
import pino from 'pino'
import fs from 'fs'
import path from 'path'

// Pastikan folder logs ada
const LOG_DIR = path.join(process.cwd(), process.env.APP_LOGS_PATH || './.logs')
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
}

// Konfigurasi logger
export const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    timestamp: pino.stdTimeFunctions.isoTime, // ISO Format (2025-10-22T11:00:00.000Z)
    transport: process.env.NODE_ENV === 'production'
        ? {
            targets: [
                {
                    target: 'pino/file',
                    options: { destination: `${LOG_DIR}/app.log`, mkdir: true },
                    level: 'info',
                }
            ]
        }
        : {
            targets: [
                {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard', // tampil lebih human-readable
                    },
                    level: 'debug',
                },
                {
                    target: 'pino/file',
                    options: { destination: `${LOG_DIR}/app.log`, mkdir: true },
                    level: 'info',
                }
            ]
        }
})
