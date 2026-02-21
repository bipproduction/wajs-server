import "colors";
import fs from 'fs/promises';
import path from 'path';
import qrcode from 'qrcode-terminal';
import WAWebJS, { Client, LocalAuth } from 'whatsapp-web.js';
import { logger } from '../logger';
import { prisma } from '../prisma';


type HookData =
    | { eventType: "qr"; qr: string }
    | { eventType: "start" }
    | { eventType: "ready" }
    | { eventType: "disconnected"; reason?: string }
    | { eventType: "reconnect" }
    | { eventType: "auth_failure"; msg: string }
    | { eventType: "message" } & Partial<WAWebJS.Message>;


async function handleHook(data: HookData) {
    const webHooks = await prisma.webHook.findMany({ where: { enabled: true } });
    if (webHooks.length === 0) return;
    await Promise.allSettled(
        webHooks.map(async (hook) => {
            try {
                log(`🌐 Mengirim webhook ke ${hook.name} ${hook.url}`);

                let res: Response = {} as Response;
                res = await fetch(hook.url, {
                    method: hook.method,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${hook.apiToken}`,
                    },
                    body: JSON.stringify(data),
                });

                const json = await res.text();
                logger.info(`[RESPONSE] ${hook.name} ${hook.url}: ${json}`);
                
            } catch (err) {
                logger.error(`[ERROR] ${hook.name} ${hook.url}:`);
                logger.error(`[ERROR] ${hook.name}: ${err}`);
            }
        })
    )

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
    handleHook({ eventType: "start" });

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: process.env.WWEBJS_AUTH || path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
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
        handleHook({ eventType: "qr", qr });
    });

    client.on('ready', () => {
        connectedAt = Date.now();
        log('✅ WhatsApp client siap digunakan!');
        state.ready = true;
        state.isReconnecting = false;
        state.isStarting = false;
        state.qr = null;
        handleHook({ eventType: "ready" });
        if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
            state.reconnectTimeout = null;
        }
    });

    client.on('auth_failure', (msg) => {
        log('❌ Autentikasi gagal:', msg);
        state.ready = false;
        handleHook({ eventType: "auth_failure", msg });
    });

    client.on('disconnected', async (reason) => {
        log('⚠️ Client terputus:', reason);
        state.ready = false;
        handleHook({ eventType: "disconnected", reason });

        if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);

        state.isReconnecting = true;
        log('⏳ Mencoba reconnect dalam 5 detik...');

        state.reconnectTimeout = setTimeout(async () => {
            handleHook({ eventType: "reconnect" });
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
        handleHook({ eventType: "reconnect" });
    } finally {
        state.isStarting = false;
    }
}

// === HANDLER PESAN MASUK ===
async function handleIncomingMessage(msg: WAWebJS.Message) {

    const chat = await msg.getChat();

    // await chat.sendStateTyping();
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

    handleHook({ eventType: "message", ...msg })


}

// === CLEANUP SAAT EXIT ===
process.on('SIGINT', () => {
    log('🛑 SIGINT diterima, menutup client...');
    destroyClient().then(() => {
        process.exit(0);
    }).catch((err) => {
        log('⚠️ Error saat destroyClient:', err);
        process.exit(1);
    });
});


const getState = () => state;

export { destroyClient, getState, startClient };

if (import.meta.main) {
    await startClient();
}
