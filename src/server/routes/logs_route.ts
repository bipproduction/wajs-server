import Elysia, { t } from "elysia";
import fs from "fs/promises";
import path from "path";

const LOGS_PATH = process.env.APP_LOGS_PATH || "./.logs";

// Pastikan folder log ada saat startup
(async () => {
    try {
        await fs.access(LOGS_PATH);
    } catch {
        await fs.mkdir(LOGS_PATH, { recursive: true });
    }
})();

// Helper baca log file + optional filter
async function readLogs(limit?: number, level?: string) {
    const filePath = path.join(LOGS_PATH, "app.log");

    try {
        const data = await fs.readFile(filePath, "utf-8");
        let lines = data.trim().split("\n").filter(Boolean); // tiap baris = JSON log

        if (limit) {
            lines = lines.slice(-limit);
        }

        let parsed = lines.map((line) => {
            try {
                return JSON.parse(line);
            } catch {
                return { raw: line };
            }
        });

        // Filter berdasarkan level (error, info, debug, warn)
        if (level) {
            parsed = parsed.filter((log) =>
                log.level ? String(log.level) === level || log.level === level : false
            );
        }

        return parsed;
    } catch {
        return null;
    }
}

const LogsRoute = new Elysia({
    prefix: "/logs",
    tags: ["logs"],
})
    /**
     * GET /logs/app?lines=100&level=error
     */
    .get("/show", async ({ query }) => {
        const lines = query.lines ? Number(query.lines) : undefined;
        const level = query.level || undefined;

        const logs = await readLogs(lines, level);

        if (!logs) {
            return {
                success: false,
                message: "Log file not found or unreadable",
            };
        }

        return {
            success: true,
            total: logs.length,
            data: logs,
        };
    }, {
        query: t.Object({
            lines: t.Optional(t.Number()),
            level: t.Optional(t.String()),
        }),
        detail: {
            summary: "Get logs",
            description: "Get logs from app.log",
        }
    })
    .post("/clear", async () => {
        await fs.rm(path.join(LOGS_PATH, "app.log"));
        return {
            success: true,
            message: "Log file cleared",
        };
    }, {
        detail: {
            summary: "Clear logs",
            description: "Clear logs from app.log",
        }
    });

export default LogsRoute;
