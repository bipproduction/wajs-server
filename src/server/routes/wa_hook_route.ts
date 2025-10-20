import Elysia, { t } from "elysia";
import { prisma } from "../lib/prisma";

const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})
    // ✅ Handle verifikasi Webhook (GET)
    .get("/hook", async (ctx) => {
        const { query, set } = ctx;
        const mode = query["hub.mode"];
        const challenge = query["hub.challenge"];
        const verifyToken = query["hub.verify_token"];

        const getToken = await prisma.apiKey.findUnique({
            where: {
                key: verifyToken,
            }
        });

        console.log(getToken);

        if (!getToken) {
            set.status = 403;
            return "Verification failed [ERR01]";
        }

        if (mode === "subscribe") {
            set.status = 200;
            return challenge;
        }

        set.status = 403;
        return "Verification failed [ERR02]";
    }, {
        query: t.Object({
            ["hub.mode"]: t.Optional(t.String()),
            ["hub.verify_token"]: t.Optional(t.String()),
            ["hub.challenge"]: t.Optional(t.String())
        }),
        detail: {
            summary: "Webhook Verification",
            description: "Verifikasi dari WhatsApp API",
        }
    })

    // ✅ Handle incoming message (POST)
    .post("/hook", async ({ body }) => {
        console.log("Incoming WhatsApp Webhook:", body);

        await prisma.waHook.create({
            data: {
                data: body,
            },
        });

        return {
            success: true,
            message: "WhatsApp Hook received"
        };
    }, {
        body: t.Any(),
        detail: {
            summary: "Receive WhatsApp Messages",
            description: "Menerima pesan dari WhatsApp Webhook"
        }
    })
    .get("/list-wahook", async () => {
        const list = await prisma.waHook.findMany();
        return {
            list,
        };
    }, {
        detail: {
            summary: "List WhatsApp Hook",
            description: "List semua WhatsApp Hook",
        }
    });

export default WaHookRoute;
