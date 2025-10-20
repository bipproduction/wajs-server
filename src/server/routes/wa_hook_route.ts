import Elysia, { t } from "elysia";

const VERIFY_TOKEN = "token_yang_kamu_set_di_dashboard";

const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})
    // ✅ Handle verifikasi Webhook (GET)
    .get("/hook", ({ query, set }) => {
        const mode = query["hub.mode"];
        const token = query["hub.verify_token"];
        const challenge = query["hub.challenge"];

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            set.status = 200;
            return challenge; // WA butuh raw challenge string
        }

        set.status = 403;
        return "Verification failed";
    }, {
        query: t.Object({
            "hub.mode": t.Optional(t.String()),
            "hub.verify_token": t.Optional(t.String()),
            "hub.challenge": t.Optional(t.String())
        }),
        detail: {
            summary: "Webhook Verification",
            description: "Verifikasi dari WhatsApp API",
        }
    })

    // ✅ Handle incoming message (POST)
    .post("/hook", async ({ body }) => {
        console.log("Incoming WhatsApp Webhook:", body);

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
    });

export default WaHookRoute;
