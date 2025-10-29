import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { prisma } from '../prisma';
import { getValueByPath } from '../get_value_by_path';
import "colors"
import { logger } from '../logger';
import _ from 'lodash';
import MimeType from '../mim_utils';
import sharp from "sharp";

interface Base64ImageResult {
    fileName: string;
    base64: string;
    sizeBeforeKB: number;
    sizeAfterKB: number;
}

export async function convertImageToPngBase64(
    inputPath: string,
): Promise<Base64ImageResult> {
    // Baca buffer asli
    const originalBuffer = await fs.readFile(inputPath);
    const sizeBeforeKB = originalBuffer.length / 1024;

    // Konversi & kompres ke PNG
    const optimizedBuffer = await sharp(originalBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer();

    const sizeAfterKB = optimizedBuffer.length / 1024;

    // Convert ke base64
    const base64 = `data:image/png;base64,${optimizedBuffer.toString("base64")}`;

    return {
        fileName: inputPath.split("/").pop() || "image.png",
        base64,
        sizeBeforeKB,
        sizeAfterKB,
    };
}



const MEDIA_DIR = path.join(process.cwd(), 'downloads');
await ensureDir(MEDIA_DIR);

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

type DataMessage = {
    from: string;
    fromNumber: string;
    fromMe: boolean;
    body: string;
    hasMedia: boolean;
    type: WAWebJS.MessageTypes;
    to: string;
    deviceType: string;
    media: Record<string, any>;
    notifyName: string;
}

// === STATE GLOBAL ===
const state = {
    client: null as Client | null,
    reconnectTimeout: null as NodeJS.Timeout | null,
    isReconnecting: false,
    isStarting: false,
    qr: null as string | null,
    ready: false,
    async restart() {
        log('🔄 Restart manual diminta...');
        await destroyClient();
        await startClient();
    },

    async forceStart() {
        log('⚠️ Force start — menghapus cache dan session auth...');
        await destroyClient();
        await safeRm("./.wwebjs_auth");
        await safeRm("./wwebjs_cache");
        await startClient();
    },
    async stop() {
        log('🛑 Stop manual diminta...');
        await destroyClient();
    },
};

// === UTIL ===
function log(...args: any[]) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}


async function safeRm(path: string) {
    try {
        await fs.rm(path, { recursive: true, force: true });
    } catch (err) {
        log(`⚠️ Gagal hapus ${path}:`, err);
    }
}

// === CLEANUP CLIENT ===
async function destroyClient() {
    if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        state.reconnectTimeout = null;
    }
    if (state.client) {
        try {
            state.client.removeAllListeners();
            await state.client.destroy();
            log('🧹 Client lama dihentikan & listener dibersihkan');
        } catch (err) {
            log('⚠️ Gagal destroy client:', err);
        }
        state.client = null;
        state.ready = false;
    }
}

let connectedAt: number | null = null;

// === PEMBUATAN CLIENT ===
async function startClient() {
    if (state.isStarting || state.isReconnecting) {
        log('⏳ startClient diabaikan — proses sedang berjalan...');
        return;
    }
    state.isStarting = true;

    await destroyClient();

    log('🚀 Memulai WhatsApp client...');
    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: process.env.WWEBJS_AUTH || path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        },
        webVersionCache: {
            path: process.env.WWEBJS_CACHE || path.join(process.cwd(), '.wwebjs_cache'),
            type: 'local',
        }
    });

    state.client = client;

    // === EVENT LISTENERS ===
    client.on('qr', (qr) => {
        state.qr = qr;
        qrcode.generate(qr, { small: true });
        log('🔑 QR code baru diterbitkan');
    });

    client.on('ready', () => {
        connectedAt = Date.now();
        log('✅ WhatsApp client siap digunakan!');
        state.ready = true;
        state.isReconnecting = false;
        state.isStarting = false;
        state.qr = null;
        if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
            state.reconnectTimeout = null;
        }
    });

    client.on('auth_failure', (msg) => {
        log('❌ Autentikasi gagal:', msg);
        state.ready = false;
    });

    client.on('disconnected', async (reason) => {
        log('⚠️ Client terputus:', reason);
        state.ready = false;

        if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
        log('⏳ Mencoba reconnect dalam 5 detik...');

        state.reconnectTimeout = setTimeout(async () => {
            state.isReconnecting = false;
            await startClient();
        }, 5000);
    });

    client.on('message', handleIncomingMessage);

    // === INISIALISASI ===
    try {
        await client.initialize();
    } catch (err) {
        log('❌ Gagal inisialisasi client:', err);
        log('⏳ Mencoba reconnect dalam 10 detik...');
        state.reconnectTimeout = setTimeout(async () => {
            state.isReconnecting = false;
            await startClient();
        }, 10000);
    } finally {
        state.isStarting = false;
    }
}

// === HANDLER PESAN MASUK ===
async function handleIncomingMessage(msg: WAWebJS.Message) {
    const chat = await msg.getChat();
    await chat.sendStateTyping();
    log(`💬 Pesan dari ${msg.from}: ${msg.body || '[MEDIA]'}`);

    if (!connectedAt) return;
    if (msg.timestamp * 1000 < connectedAt) return;

    if (msg.from.endsWith('@g.us') || msg.isStatus || msg.from === 'status@broadcast') {
        log(`🚫 Pesan dari grup/status diabaikan (${msg.from})`);
        return;
    }

    if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        (msg as any).media = media;
    }
    
    console.log("kirim ke webhook")
    const res = await fetch("https://n8n.wibudev.com/webhook/dc164759-b7ba-47d5-b5d8-ffd9d5840090", {
        body: JSON.stringify(msg),
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })

    const json = await res.text();
    console.log(json);

    try {
        // const notifyName = (msg as any)._data.notifyName;

        // const dataMessage: DataMessage = {
        //     from: msg.from,
        //     fromNumber: msg.from.split('@')[0] || '',
        //     fromMe: msg.fromMe,
        //     body: msg.body,
        //     hasMedia: msg.hasMedia,
        //     type: msg.type,
        //     to: msg.to,
        //     deviceType: msg.deviceType,
        //     media: (msg as any).media,
        //     notifyName,
        // };

        // === KIRIM KE WEBHOOK ===
        // try {
        //     const webhooks = await prisma.webHook.findMany({ where: { enabled: true } });
        //     if (!webhooks.length) {
        //         log('🚫 Tidak ada webhook yang aktif');
        //         return; 
        //     }



        //     // await Promise.allSettled(
        //     //     webhooks.map(async (hook) => {
        //     //         try {
        //     //             log(`🌐 Mengirim webhook ke ${hook.url}`);

        //     //             let res: Response = {} as Response;
        //     //             if (!dataMessage.hasMedia) {
        //     //                 logger.info(`[SEND NO MEDIA] ${hook.url}`);
        //     //                 res = await fetch(hook.url, {
        //     //                     method: hook.method,
        //     //                     headers: {
        //     //                         "Content-Type": "application/json",
        //     //                         Authorization: `Bearer ${hook.apiToken}`,
        //     //                     },
        //     //                     body: JSON.stringify({
        //     //                         question: msg.body,
        //     //                         overrideConfig: {
        //     //                             sessionId: `${_.kebabCase(dataMessage.fromNumber)}_x_${dataMessage.fromNumber}`,
        //     //                             vars: { userName: _.kebabCase(dataMessage.fromNumber), userPhone: dataMessage.fromNumber },
        //     //                         }
        //     //                     }),
        //     //                 });
        //     //             }

        //     //             if (dataMessage.hasMedia) {
        //     //                 logger.info(`[SEND MEDIA] ${hook.url}`);
        //     //                 const media = await msg.downloadMedia();

        //     //                 const mimeMessage = media.mimetype || 'application/octet-stream';
        //     //                 const typeMime = new MimeType(mimeMessage);

        //     //                 const prefixedBase64 = `data:${mimeMessage};base64,${media.data}`;

        //     //                 dataMessage.media = {
        //     //                     type: typeMime.getCategory() === "image" ? "file" : "file:full",
        //     //                     data: prefixedBase64,
        //     //                     mime: mimeMessage,
        //     //                     name: media.filename || `${uuid()}.${typeMime.getExtension()}`
        //     //                 };

        //     //                 res = await fetch(hook.url, {
        //     //                     method: hook.method,
        //     //                     headers: {
        //     //                         "Content-Type": "application/json",
        //     //                         Authorization: `Bearer ${hook.apiToken}`,
        //     //                     },
        //     //                     body: JSON.stringify({
        //     //                         question: msg.body || dataMessage.media.mime,
        //     //                         overrideConfig: {
        //     //                             sessionId: `${_.kebabCase(dataMessage.fromNumber)}_x_${dataMessage.fromNumber}`,
        //     //                             vars: { userName: _.kebabCase(dataMessage.fromNumber), userPhone: dataMessage.fromNumber },
        //     //                         },
        //     //                         uploads: [dataMessage.media],
        //     //                     }),
        //     //                 });
        //     //             }

        //     //             const responseText = await res.text();


        //     //             if (!res.ok) {
        //     //                 log(`⚠️ Webhook ${hook.url} gagal: ${res.status}`);
        //     //                 logger.error(`[REPLY] Response: ${responseText}`);
        //     //                 await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR01]");
        //     //                 return;
        //     //             }

        //     //             const responseJson = JSON.parse(responseText);
        //     //             logger.info(`[REPLY] Response: ${responseJson.text}`);

        //     //             if (hook.replay) {
        //     //                 try {
        //     //                     const textResponseRaw = hook.replayKey
        //     //                         ? getValueByPath(responseJson, hook.replayKey, JSON.stringify(responseJson))
        //     //                         : JSON.stringify(responseJson, null, 2);

        //     //                     await chat.clearState();
        //     //                     // send message
        //     //                     await chat.sendMessage(textResponseRaw);

        //     //                     logger.info(`💬 Balasan dikirim ke ${msg.from}`);
        //     //                 } catch (err) {
        //     //                     logger.error(`⚠️ Gagal menampilkan status mengetik: ${err}`);
        //     //                     await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR03]");
        //     //                 }
        //     //             }
        //     //         } catch (err) {
        //     //             logger.error(`❌ Gagal kirim ke ${hook.url}: ${err}`);
        //     //             await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR04]");
        //     //         }
        //     //     })
        //     // );
        // } catch (error) {
        //     logger.error(`❌ Error mengirim webhook [ERR05]: ${error}`);
        //     await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR05]");
        // }
    } catch (err) {
        logger.error(`❌ Error handling pesan [ERR06]: ${err}`);
        await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR06]");
    } finally {
        await chat.clearState();
    }
}


// === CLEANUP SAAT EXIT ===
process.on('SIGINT', async () => {
    log('🛑 SIGINT diterima, menutup client...');
    await destroyClient();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('🛑 SIGTERM diterima, menutup client...');
    await destroyClient();
    process.exit(0);
});


const getState = () => state;

export { startClient, destroyClient, getState };

if (import.meta.main) {
    await startClient();
}
