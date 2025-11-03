import Elysia, { t, type Context } from "elysia";
import { startClient, getState } from "../lib/wa/wa_service";
import _ from "lodash";
import mime from "mime-types";
import { MessageMedia } from "whatsapp-web.js";

const WaRoute = new Elysia({
    prefix: "/wa",
    tags: ["WhatsApp"]
})
    .post("/start", async () => {
        startClient();
        return {
            message: "WhatsApp route started",
        };
    })
    .get("/qr", () => {
        const state = getState();
        return {
            qr: state.qr,
        };
    })
    .get("/ready", () => {
        const state = getState();
        return {
            ready: state.ready,
        };
    })
    .post("/restart", async () => {
        getState().restart();
        return {
            message: "WhatsApp route restarted",
        };
    })
    .post("/force-start", async () => {
        getState().forceStart();
        return {
            message: "WhatsApp route force started",
        };
    })
    .post("/stop", async () => {
        getState().stop();
        return {
            message: "WhatsApp route stopped",
        };
    })
    .get("/state", () => {
        const state = getState();
        return {
            state: _.omit(state, "client"),
        };
    })
    .post("send-text", async ({ body }) => {
        const state = getState();
        if (!state.ready) {
            return {
                message: "WhatsApp route not ready",
            };
        }

        const client = state.client;
        if (!client) {
            return {
                message: "WhatsApp client not ready",
            };
        }


        const chat = await client.getChatById(`${body.number}@c.us`);
        await chat.sendMessage(body.text);

        return {
            message: "WhatsApp route ready",
        };
    }, {
        body: t.Object({
            number: t.String(),
            text: t.String(),
        }),
        detail: {
            description: "Send text to WhatsApp",
            tags: ["WhatsApp"],
        }
    })
    .post(
        "/send-media",
        async ({ body }) => {
            const state = getState();
            if (!state.ready)
                return { message: "WhatsApp route not ready" };

            const client = state.client;
            if (!client)
                return { message: "WhatsApp client not ready" };

            try {
                const { number, caption, media } = body;
                const jid = `${number}@c.us`;

                // Siapkan data media
                const { data, filename, mimetype } = media;
                const mimeType = mimetype || mime.lookup(filename) || "application/octet-stream";
                const fileName = filename || `file.${mime.extension(mimeType) || "bin"}`;

                const waMedia = new MessageMedia(mimeType, data, fileName);

                // Tentukan opsi pengiriman otomatis
                const sendOptions: any = { caption };

                if (mimeType.startsWith("audio/")) {
                    // kirim voice note jika ogg/opus
                    sendOptions.sendAudioAsVoice =
                        mimeType.includes("ogg") || mimeType.includes("opus");
                } else if (
                    !mimeType.startsWith("image/") &&
                    !mimeType.startsWith("video/")
                ) {
                    // selain gambar/video kirim sebagai dokumen
                    sendOptions.sendMediaAsDocument = true;
                }

                await client.sendMessage(jid, waMedia, sendOptions);

                return {
                    success: true,
                    message: `✅ Media sent to ${number}`,
                    info: { filename: fileName, mimetype: mimeType },
                };
            } catch (err: any) {
                console.error("Send media error:", err);
                return {
                    success: false,
                    message: "❌ Failed to send media",
                    error: err.message,
                };
            }
        },
        {
            body: t.Object({
                number: t.String({ minLength: 10, maxLength: 15 }),
                caption: t.Optional(t.String({ maxLength: 255 })),
                media: t.Object({
                    data: t.String(), // base64 tanpa prefix
                    filename: t.String({ minLength: 1, maxLength: 255 }),
                    mimetype: t.String({ minLength: 1, maxLength: 255 }),
                }),
            }),
            detail: {
                description:
                    "Send media (image, audio, video, PDF, or any file) to WhatsApp",
                tags: ["WhatsApp"],
            },
        }
    );

export default WaRoute;
