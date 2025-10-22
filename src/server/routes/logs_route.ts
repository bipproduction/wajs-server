import Elysia from "elysia";
import fs from "fs/promises";
import path from "path";

const LOGS_PATH = process.env.APP_LOGS_PATH || "./.logs";

const LogsRoute = new Elysia({
  prefix: "/logs", // lebih aman pakai "/" di depan
  tags: ["logs"]
})
  .get("/app", async () => {
    const filePath = path.join(LOGS_PATH, "app.log");

    try {
      const logs = await fs.readFile(filePath, "utf-8");
      // Format: array line-by-line (optional)
      return logs.split("\n").filter(Boolean);
    } catch (err) {
      return {
        error: "Log file not found or cannot be read",
        details: (err as Error).message,
      };
    }
  });

export default LogsRoute;
