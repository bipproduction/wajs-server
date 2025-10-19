import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { prisma } from '../prisma';
import { getValueByPath } from '../get_value_by_path';

// === KONFIGURASI UTAMA ===
const MEDIA_DIR = path.join(process.cwd(), 'downloads');
await ensureDir(MEDIA_DIR);

type DataMessage = {
    from: string;
    fromNumber: string;
    fromMe: boolean;
    body: string;
    hasMedia: boolean;
    type: WAWebJS.MessageTypes;
    to: string;
    deviceType: string;
    media: {
        data: WAWebJS.MessageMedia["data"];
        mimetype: WAWebJS.MessageMedia["mimetype"];
        filename: WAWebJS.MessageMedia["filename"];
        filesize: WAWebJS.MessageMedia["filesize"];
    };
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

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
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
            dataPath: path.join(process.cwd(), '.wwebjs_auth'),
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
    });

    state.client = client;

    // === EVENT LISTENERS ===
    client.on('qr', (qr) => {
        state.qr = qr;
        qrcode.generate(qr, { small: true });
        log('🔑 QR code baru diterbitkan');
    });

    client.on('ready', () => {
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
    log(`💬 Pesan dari ${msg.from}: ${msg.body || '[MEDIA]'}`);
    if (msg.from.endsWith('@g.us') || msg.isStatus || msg.from === 'status@broadcast') {
        log(`🚫 Pesan dari grup/status diabaikan (${msg.from})`);
        return;
    }

    try {

        const body = msg.body?.toLowerCase().trim() || '';
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
            media: {
                data: null as unknown as WAWebJS.MessageMedia['data'],
                mimetype: null as unknown as WAWebJS.MessageMedia['mimetype'],
                filename: null as unknown as WAWebJS.MessageMedia['filename'],
                filesize: null as unknown as WAWebJS.MessageMedia['filesize'],

            },
            notifyName,
        };

        // Media handler
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();

            dataMessage.media = {
                data: media.data,
                mimetype: media.mimetype,
                filename: media.filename,
                filesize: media.filesize
            };
        }

        // to web hook
        try {
            const webhooks = await prisma.webHook.findMany({ where: { enabled: true } });

            if (!webhooks.length) {
                log('🚫 Tidak ada webhook yang aktif');
                return;
            }

            await Promise.allSettled(
                webhooks.map(async (hook) => {
                    try {
                        console.log("send webhook " + hook.url);
                        const body = payloadConverter({ payload: hook.payload ?? JSON.stringify(dataMessage), data: dataMessage });
                        const res = await fetch(hook.url, {
                            method: hook.method,
                            headers: {
                                ...(JSON.parse(hook.headers ?? '{}') as Record<string, string>),
                                ...(hook.apiToken ? { Authorization: `Bearer ${hook.apiToken}` } : {}),
                            },
                            body,
                        });

                        if (!res.ok) log(`⚠️ Webhook ${hook.url} gagal: ${res.status}`);
                        const responseJson = await res.json();

                        if (hook.replay) {
                            try {
                                // === Simulasikan sedang mengetik ===
                                const chat = await msg.getChat();
                                await chat.sendStateTyping(); // tampilkan status 'sedang mengetik...'

                                // Durasi delay tergantung panjang teks (lebih panjang = lebih lama)
                                const textResponseRaw = hook.replayKey
                                    ? getValueByPath(responseJson, hook.replayKey, JSON.stringify(responseJson))
                                    : JSON.stringify(responseJson, null, 2);

                                const typingDelay = Math.min(5000, Math.max(1500, textResponseRaw.length * 20)); // 1.5–5 detik
                                await new Promise((resolve) => setTimeout(resolve, typingDelay));

                                // Setelah delay, hentikan typing indicator
                                await chat.clearState(); // hilangkan status "mengetik..."

                                // Kirim balasan ke pengirim
                                await msg.reply(textResponseRaw);

                                log(`💬 Balasan dikirim ke ${msg.from} setelah mengetik selama ${typingDelay}ms`);
                            } catch (err) {
                                log('⚠️ Gagal menampilkan status mengetik:', err);
                                await msg.reply(hook.replayKey
                                    ? getValueByPath(responseJson, hook.replayKey, JSON.stringify(responseJson))
                                    : JSON.stringify(responseJson, null, 2)
                                );
                            }
                        }

                    } catch (err) {
                        log(`❌ Gagal kirim ke ${hook.url}:`, err);
                    }
                })
            );

        } catch (error) {
            console.log(error);
        }
    } catch (err) {
        log('❌ Error handling pesan:', err);
    }
}

function payloadConverter({ payload, data }: { payload: string; data: DataMessage }) {
    try {
        const map: Record<string, string | number | boolean | null> = {
            'data.from': data.from,
            'data.fromNumber': data.fromNumber,
            'data.fromMe': data.fromMe,
            'data.body': data.body,
            'data.hasMedia': data.hasMedia,
            'data.type': data.type,
            'data.to': data.to,
            'data.deviceType': data.deviceType,
            'data.notifyName': data.notifyName,
            'data.media.data': data.media?.data ?? null,
            'data.media.mimetype': data.media?.mimetype ?? null,
            'data.media.filename': data.media?.filename ?? null,
            'data.media.filesize': data.media?.filesize ?? 0,
        };

        let result = payload;
        for (const [key, value] of Object.entries(map)) {
            result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''));
        }
        return result;
    } catch {
        return JSON.stringify(data, null, 2);
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
