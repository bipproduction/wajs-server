import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { prisma } from '../prisma';
import { getValueByPath } from '../get_value_by_path';
import "colors"

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
    media: any[] | null;
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

function detectFileCategory(mime: string) {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    if (mime === "application/pdf") return "pdf";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "excel";
    if (mime.includes("word")) return "document";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
    return "file";
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

    try {
        const notifyName = (msg as any)._data.notifyName;

        const dataMessage: DataMessage = {
            from: msg.from,
            fromNumber: msg.from.split('@')[0] || '',
            fromMe: msg.fromMe,
            body: msg.body,
            hasMedia: msg.hasMedia,
            type: msg.type,
            to: msg.to,
            deviceType: msg.deviceType,
            media: null,
            notifyName,
        };

        // === HANDLE MEDIA ===
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();

            // Pastikan formatnya data:<mimetype>;base64,<data>
            const mime = media.mimetype || 'application/octet-stream';
            const prefixedBase64 = `data:${mime};base64,${media.data}`;

            dataMessage.media = [{
                type: "file:full",
                data: prefixedBase64,
                mime: mime,
                name: media.filename || `${uuid()}.${mime.split('/')[1] || 'bin'}`
            }];

            // await fs.writeFile(path.join(MEDIA_DIR, dataMessage.media[0].name), Buffer.from(media.data, 'base64'));

        }

        // === KIRIM KE WEBHOOK ===
        try {
            const webhooks = await prisma.webHook.findMany({ where: { enabled: true } });
            if (!webhooks.length) {
                log('🚫 Tidak ada webhook yang aktif');
                return;
            }

            await Promise.allSettled(
                webhooks.map(async (hook) => {
                    try {
                        log(`🌐 Mengirim webhook ke ${hook.url}`);

                        let body = payloadConverter({
                            payload: hook.payload ?? JSON.stringify(dataMessage),
                            data: dataMessage,
                        });

                        if (dataMessage.hasMedia) {
                            const bodyMedia = JSON.parse(body);
                            bodyMedia.question = msg.body ?? dataMessage.media?.[0].mime;
                            bodyMedia.uploads = dataMessage.media;
                            body = JSON.stringify(bodyMedia);
                        }

                        // await fs.writeFile(path.join(process.cwd(), 'webhook.json'), body);

                        const res = await fetch(hook.url, {
                            method: hook.method,
                            headers: {
                                ...(JSON.parse(hook.headers ?? '{}') as Record<string, string>),
                                ...(hook.apiToken ? { Authorization: `Bearer ${hook.apiToken}` } : {}),
                            },
                            body,
                        });

                        const responseText = await res.text();

                        if (!res.ok) {
                            log(`⚠️ Webhook ${hook.url} gagal: ${res.status}`);
                            log(responseText);
                            await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR01]");
                            return;
                        }

                        const responseJson = JSON.parse(responseText);

                        if (hook.replay) {
                            try {
                                const textResponseRaw = hook.replayKey
                                    ? getValueByPath(responseJson, hook.replayKey, JSON.stringify(responseJson))
                                    : JSON.stringify(responseJson, null, 2);

                                const typingDelay = Math.min(5000, Math.max(1500, textResponseRaw.length * 20));
                                await new Promise((r) => setTimeout(r, typingDelay));

                                await chat.clearState();
                                // send message
                                await chat.sendMessage(textResponseRaw);

                                log(`💬 Balasan dikirim ke ${msg.from} setelah mengetik selama ${typingDelay}ms`);
                            } catch (err) {
                                log('⚠️ Gagal menampilkan status mengetik:', err);
                                await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR03]");
                            }
                        }
                    } catch (err) {
                        log(`❌ Gagal kirim ke ${hook.url}:`, err);
                        await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR04]");
                    }
                })
            );
        } catch (error) {
            log('❌ Error mengirim webhook:', error);
            await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR05]");
        }
    } catch (err) {
        log('❌ Error handling pesan:', err);
        await msg.reply("Maaf, terjadi kesalahan saat memproses pesan Anda [ERR06]");
    } finally {
        await chat.clearState();
    }
}


function payloadConverter({ payload, data }: { payload: string; data: DataMessage }) {
    try {
        const map: Record<string, any> = {
            'data.from': data.from,
            'data.fromNumber': data.fromNumber,
            'data.fromMe': data.fromMe,
            'data.body': data.body,
            'data.hasMedia': data.hasMedia,
            'data.type': data.type,
            'data.to': data.to,
            'data.deviceType': data.deviceType,
            'data.notifyName': data.notifyName,
            'data.media': data.media
        };

        let result = payload;

        for (const [key, value] of Object.entries(map)) {
            let safeValue: string;

            if (value === null || value === undefined) {
                safeValue = '';
            } else if (typeof value === 'object') {
                // Perbaikan di sini — objek seperti media dikonversi ke JSON string
                safeValue = JSON.stringify(value);
            } else {
                safeValue = String(value);
            }

            result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), safeValue);
        }

        return result;
    } catch (err) {
        console.error("⚠️ payloadConverter error:", err);
        return JSON.stringify(data);
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
