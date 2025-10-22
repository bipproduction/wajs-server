import { WhatsAppAPI } from "whatsapp-api-js";
import { Document, Image, Text } from "whatsapp-api-js/messages";
import type { IncomingHttpHeaders } from "http";
import { logger } from "../logger";


// Jangan hardcode — ini hanya contoh
const TOKEN: string = process.env.WA_TOKEN!;
const APP_SECRET: string = process.env.WA_APP_SECRET!;

logger.info("WA API started");

// Inisialisasi WhatsApp API dengan typing generik jika diperlukan (contoh: number sebagai tipe session)
const Whatsapp = new WhatsAppAPI<number>({
    token: TOKEN,
    appSecret: APP_SECRET
});

// Tipe untuk request body dari server (bisa disesuaikan dengan framework seperti Express, Elysia, Hono, dll)
interface PostRequest {
    data: string | Buffer;
    headers: IncomingHttpHeaders & {
        "x-hub-signature-256"?: string;
    };
}

// Fungsi handler webhook POST
export async function post(req: PostRequest) {
    logger.info("WA API received");
    const signature = req.headers["x-hub-signature-256"] ?? "";
    return await Whatsapp.post(
        JSON.parse(req.data.toString()),
        req.data.toString(),
        signature,
    );
}

export function whatsappApiInit() {
    // Handler jika ada pesan masuk dari user
    Whatsapp.on.message = async ({ phoneID, from, message, name, Whatsapp, reply }) => {
        logger.info(
            `User ${name} (${from}) sent to bot ${phoneID} ${JSON.stringify(message)}`
        );

        let response;

        switch (message.type) {
            case "text":
                logger.info("Text received");
                response = await reply(
                    new Text(`*${name}* said:\n\n${message.text.body}`),
                    true
                );
                logger.info("Text sent");
                break;

            case "image":
                logger.info("Image received");
                response = await reply(
                    new Image(message.image.id, true, `Nice photo, ${name}`)
                );
                logger.info("Image sent");
                break;

            case "document":
                logger.info("Document received");
                response = await reply(
                    new Document(message.document.id, true, undefined, "Our document")
                );
                logger.info("Document sent");
                break;

            default:
                logger.info(
                    "Unhandled message type. More types available: contacts, locations, templates, interactive, reactions, audio, video, etc."
                );
                break;
        }

        logger.info("Response sent");

        // Tandai pesan sudah dibaca
        Whatsapp.markAsRead(phoneID, message.id);

        return 200;
    };

    // Handler saat pesan berhasil terkirim
    Whatsapp.on.sent = ({ phoneID, to, message }) => {
        logger.info(`Bot ${phoneID} sent to user ${to} ${message}`);
    };

}