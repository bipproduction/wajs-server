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
            success: true,
            message: chat.id,
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
                number: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"] }),
                caption: t.Optional(t.String({ maxLength: 255, examples: ["Hello World"] })),
                media: t.Object({
                    data: t.String({ examples: ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC..."], description: "Base64 encoded media data" }),
                    filename: t.String({ minLength: 1, maxLength: 255, examples: ["file.png"] }),
                    mimetype: t.String({ minLength: 1, maxLength: 255, examples: ["image/png"] }),
                }),
            }),
            detail: {
                summary: "Send media to WhatsApp",
                description:
                    "Send media (image, audio, video, PDF, or any file) to WhatsApp"
            },
        }
    )
    .get("/code", async (ctx: Context) => {
        const { nom, text } = ctx.query

        if (!nom || !text) {
            ctx.set.status = 400;
            return {
                message: "[QUERY] Nomor dan teks harus diisi",
            };
        }

        const state = getState();

        if (!state.ready) {
            ctx.set.status = 400;
            return {
                message: "[READY] WhatsApp client tidak siap",
            };
        }

        if (!state.client) {
            ctx.set.status = 400;
            return {
                message: "[CLIENT] WhatsApp client tidak siap",
            };
        }

        const chat = await state.client.sendMessage(`${nom}@c.us`, text);
        return {
            message: "✅ Message sent",
            info: chat.id,
        };
    }, {
        query: t.Object({
            nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"] }),
            text: t.String({ examples: ["Hello World"] }),
        }),
        detail: {
            summary: "Send text to WhatsApp",
            description:
                "Send text to WhatsApp via GET request"
        },
    })
    .post("/send-seen", async (ctx: Context) => {
        const { nom } = ctx.query

        if (!nom) {
            ctx.set.status = 400;
            return {
                message: "[QUERY] Nomor harus diisi",
            };
        }

        const state = getState();

        if (!state.ready) {
            ctx.set.status = 400;
            return {
                message: "[READY] WhatsApp client tidak siap",
            };
        }

        if (!state.client) {
            ctx.set.status = 400;
            return {
                message: "[CLIENT] WhatsApp client tidak siap",
            };
        }

        const chat = await state.client.getChatById(`${nom}@c.us`);
        // await chat.sendSeen();
        return {
            message: "✅ Seen sent",
            info: chat.id,
        };
    }, {
        query: t.Object({
            nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"] }),
        }),
        detail: {
            summary: "Send seen to WhatsApp",
            description:
                "Send seen to WhatsApp via GET request"
        },
    })
    .post("/send-typing", async (ctx: Context) => {
        const { nom } = ctx.query

        if (!nom) {
            ctx.set.status = 400;
            return {
                message: "[QUERY] Nomor harus diisi",
            };
        }

        const state = getState();

        if (!state.ready) {
            ctx.set.status = 400;
            return {
                message: "[READY] WhatsApp client tidak siap",
            };
        }

        if (!state.client) {
            ctx.set.status = 400;
            return {
                message: "[CLIENT] WhatsApp client tidak siap",
            };
        }

        const chat = await state.client.getChatById(`${nom}@c.us`);
        await chat.sendStateTyping();
        return {
            message: "✅ Typing sent",
            info: chat.id,
        };
    }, {
        query: t.Object({
            nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"] }),
        }),
        detail: {
            summary: "Send typing to WhatsApp",
            description:
                "Send typing to WhatsApp via GET request"
        },
    });

export default WaRoute;
