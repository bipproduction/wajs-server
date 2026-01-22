// import Elysia, { t, type Context } from "elysia";
// import { startClient, getState } from "../lib/wa/wa_service";
// import _ from "lodash";
// import mime from "mime-types";
// import { MessageMedia } from "whatsapp-web.js";

// const checkClientReady = () => {
//     /**
//      * Mengecek kesiapan klien WhatsApp.
//      * Fungsi ini mengambil state saat ini dari WhatsApp service dan memeriksa
//      * apakah klien sudah siap dan terhubung ke WhatsApp Web.
//      * 
//      * @returns {Object} - Objek dengan properti client jika klien siap, 
//      *                     atau error dan status jika klien belum siap
//      */
//     const state = getState();
//     if (!state.ready || !state.client) return { error: "WhatsApp client is not ready", status: 400 };
//     return { client: state.client };
// };


// const WaRoute = new Elysia({
//     prefix: "/wa",
//     tags: ["WhatsApp"]
// })
//     .post("/start", () => {
//         startClient();
//         return { message: "WhatsApp route started" };
//     }, {
//         detail: {
//             summary: "Start WhatsApp Client",
//             description: "Initialize and start the WhatsApp Web client connection"
//         }
//     })
//     .get("/qr", () => ({ qr: getState().qr }), {
//         detail: {
//             summary: "Get QR Code",
//             description: "Retrieve the current QR code for WhatsApp Web authentication. Scan this QR code with your WhatsApp mobile app to connect."
//         }
//     })
//     .get("/ready", () => ({ ready: getState().ready }), {
//         detail: {
//             summary: "Check Ready Status",
//             description: "Check if the WhatsApp client is ready and authenticated"
//         }
//     })
//     .post("/restart", () => {
//         getState().restart();
//         return { message: "WhatsApp route restarted" };
//     }, {
//         detail: {
//             summary: "Restart WhatsApp Client",
//             description: "Restart the WhatsApp Web client connection. This will disconnect and reconnect the client."
//         }
//     })
//     .post("/force-start", () => {
//         getState().forceStart();
//         return { message: "WhatsApp route force started" };
//     }, {
//         detail: {
//             summary: "Force Start WhatsApp Client",
//             description: "Force start the WhatsApp Web client, bypassing any existing connection checks"
//         }
//     })
//     .post("/stop", () => {
//         getState().stop();
//         return { message: "WhatsApp route stopped" };
//     }, {
//         detail: {
//             summary: "Stop WhatsApp Client",
//             description: "Stop and disconnect the WhatsApp Web client"
//         }
//     })
//     .get("/state", () => ({ state: _.omit(getState(), "client") }), {
//         detail: {
//             summary: "Get Client State",
//             description: "Retrieve the current state of the WhatsApp client including connection status, QR code availability, and other metadata (excludes client object)"
//         }
//     })
//     .post("/send-text", async ({ body }) => {
//         const check = checkClientReady();
//         if (check.error) return { message: check.error };

//         const chat = await check.client!.getChatById(`${body.number}@c.us`);
//         await chat.sendMessage(body.text);
//         return { success: true, message: chat.id };
//     }, {
//         body: t.Object({
//             number: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"], description: "Recipient phone number in international format without + sign" }),
//             text: t.String({ minLength: 1, examples: ["Hello World"], description: "Text message content to send" }),
//         }),
//         detail: {
//             summary: "Send Text Message",
//             description: "Send a text message to a WhatsApp contact. The phone number should be in international format without the + sign (e.g., 6281234567890 for Indonesia)."
//         }
//     })
//     .post("/send-media", async ({ body }) => {
//         const check = checkClientReady();
//         if (check.error) return { message: check.error };

//         try {
//             const { number, caption, media } = body;
//             const { data, filename, mimetype } = media;
            
//             const mimeType = mimetype || mime.lookup(filename) || "application/octet-stream";
//             const fileName = filename || `file.${mime.extension(mimeType) || "bin"}`;
//             const waMedia = new MessageMedia(mimeType, data, fileName);
            
//             const sendOptions: any = { caption };
            
//             if (mimeType.startsWith("audio/")) {
//                 sendOptions.sendAudioAsVoice = mimeType.includes("ogg") || mimeType.includes("opus");
//             } else if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
//                 sendOptions.sendMediaAsDocument = true;
//             }

//             await check.client!.sendMessage(`${number}@c.us`, waMedia, sendOptions);
//             return {
//                 success: true,
//                 message: `✅ Media sent to ${number}`,
//                 info: { filename: fileName, mimetype: mimeType },
//             };
//         } catch (err: any) {
//             return { success: false, message: "❌ Failed to send media", error: err.message };
//         }
//     }, {
//         body: t.Object({
//             number: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"], description: "Recipient phone number in international format without + sign" }),
//             caption: t.Optional(t.String({ maxLength: 255, examples: ["Hello World"], description: "Optional caption for the media" })),
//             media: t.Object({
//                 data: t.String({ examples: ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC..."], description: "Base64 encoded media data" }),
//                 filename: t.String({ minLength: 1, maxLength: 255, examples: ["file.png"], description: "Original filename with extension" }),
//                 mimetype: t.String({ minLength: 1, maxLength: 255, examples: ["image/png"], description: "MIME type of the media file" }),
//             }, { description: "Media object containing base64 data, filename, and mimetype" }),
//         }),
//         detail: {
//             summary: "Send Media Message",
//             description: "Send media (image, audio, video, PDF, or any file) to a WhatsApp contact. Audio files (ogg/opus) are sent as voice messages. Non-image/video files are sent as documents."
//         }
//     })
//     .get("/code", async (ctx: Context) => {
//         const { nom, text } = ctx.query;
//         if (!nom || !text) {
//             ctx.set.status = 400;
//             return { message: "[QUERY] Nomor dan teks harus diisi" };
//         }

//         const check = checkClientReady();
//         if (check.error) {
//             ctx.set.status = 400;
//             return { message: `[READY] ${check.error}` };
//         }

//         const chat = await check.client!.sendMessage(`${nom}@c.us`, text);
//         return { message: "✅ Message sent", info: chat.id };
//     }, {
//         query: t.Object({
//             nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"], description: "Recipient phone number in international format without + sign" }),
//             text: t.String({ examples: ["Hello World"], description: "Text message content to send" }),
//         }),
//         detail: {
//             summary: "Send Text via GET",
//             description: "Send a text message to a WhatsApp contact using GET request with query parameters. Useful for simple integrations or webhooks."
//         }
//     })
//     .post("/send-seen", async (ctx: Context) => {
//         const { nom } = ctx.query;
//         if (!nom) {
//             ctx.set.status = 400;
//             return { message: "[QUERY] Nomor harus diisi" };
//         }

//         const check = checkClientReady();
//         if (check.error) {
//             ctx.set.status = 400;
//             return { message: `[READY] ${check.error}` };
//         }

//         const chat = await check.client!.getChatById(`${nom}@c.us`);
//         // await chat.sendSeen();
//         return { message: "✅ Seen sent", info: chat.id };
//     }, {
//         query: t.Object({
//             nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"], description: "Phone number of the chat to mark as seen" }),
//         }),
//         detail: {
//             summary: "Mark Chat as Seen",
//             description: "Mark all messages in a chat as seen/read. This will show blue ticks to the sender indicating the messages have been read."
//         }
//     })
//    .post("/send-typing", async ({ query, set }) => {
//     if (!query.nom) {
//         set.status = 400;
//         return { message: "[QUERY] Nomor harus diisi" };
//     }

//     const check = checkClientReady();
//     if (check.error) {
//         set.status = 400;
//         return { message: `[READY] ${check.error}` };
//     }

//     const chat = await check.client!.getChatById(`${query.nom}@c.us`);
//     await chat.sendStateTyping();
//     return { message: "✅ Typing sent", info: chat.id };
// }, {
//     query: t.Object({
//         nom: t.String({ minLength: 10, maxLength: 15, examples: ["6281234567890"], description: "Phone number of the chat to show typing indicator" }),
//     }),
//     detail: {
//         summary: "Send Typing Indicator",
//         description: "Show 'typing...' indicator in a chat. The recipient will see that you are typing a message."
//     }
// })

// export default WaRoute;

export {}