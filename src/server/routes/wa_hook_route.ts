import Elysia, { t } from "elysia";
import { prisma } from "../lib/prisma";
import type { WAHookMessage } from "types/wa_messages";
import _ from "lodash";
import { logger } from "../lib/logger";
import {
    WhatsAppClient,
    WhatsAppMessageType,
    type ProcessedIncomingMessage,
} from "whatsapp-client-sdk";

const client = new WhatsAppClient({
    accessToken: process.env.WA_TOKEN!,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID!,
    webhookVerifyToken: process.env.WA_WEBHOOK_TOKEN!,
});

async function fetchWithTimeout(
    input: RequestInfo,
    init: RequestInit,
    timeoutMs = 120_000
) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

const FLOW_ID = "1";

async function flowAiText({
    message
}: {
    message: ProcessedIncomingMessage;
}) {
    const flow = await prisma.chatFlows.findUnique({
        where: { id: FLOW_ID },
    });

    if (!flow) {
        logger.info("[POST] no flow found");
        return;
    }

    if (flow.defaultFlow && flow.active) {
        logger.info("[POST] flow found");

        await client.markMessageAsRead(message.id);
        await client.sendTypingIndicator(message.from);

        const { flowUrl, flowToken } = flow;

        try {
            const response = await fetchWithTimeout(
                `${flowUrl}/prediction/${flow.defaultFlow}`,
                {
                    headers: {
                        Authorization: `Bearer ${flowToken}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        question: message.text,
                        overrideConfig: {
                            sessionId: `${_.kebabCase(message.contact?.name)}_x_${message.from}`,
                            vars: { userName: _.kebabCase(message.contact?.name), userPhone: message.from },
                        },
                    }),
                }
            );

            const responseText = await response.text();

            try {
                const result = JSON.parse(responseText);
                await prisma.waHook.create({
                    data: {
                        data: JSON.stringify({
                            question: message.text,
                            name: message.contact?.name,
                            number: message.from,
                            answer: result.text,
                            flowId: flow.defaultFlow,
                        }),
                    },
                });

                if (flow.waPhoneNumberId && flow.waToken && flow.active) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await client.sendText(message.from, result.text);
                }
            } catch (error) {
                logger.error(`[POST] Error parsing AI response ${error}`);
                logger.error(responseText);
            }
        } catch (error) {
            logger.error(`[POST] Error calling flow API ${error}`);
        }
    }
}

async function flowAiImage({
    message,
    media_data,
    media_name,
    media_mime,
}: {
    message: ProcessedIncomingMessage;
    media_data: string;
    media_name: string;
    media_mime: string;
}) {
    const flow = await prisma.chatFlows.findUnique({
        where: { id: FLOW_ID },
    });

    if (!flow) {
        logger.info("[POST] no flow found");
        return;
    }

    if (flow.defaultFlow && flow.active) {
        logger.info("[POST] flow found");

        await client.markMessageAsRead(message.id);
        await client.sendTypingIndicator(message.from);

        const { flowUrl, flowToken } = flow;

        try {
            const response = await fetchWithTimeout(
                `${flowUrl}/prediction/${flow.defaultFlow}`,
                {
                    headers: {
                        Authorization: `Bearer ${flowToken}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        question: message.text || "media",
                        overrideConfig: {
                            sessionId: `${_.kebabCase(message.contact?.name)}_x_${message.from}`,
                            vars: { userName: _.kebabCase(message.contact?.name), userPhone: message.from },
                        },
                        uploads: [
                            {
                                type: "file:full",
                                name: media_name,
                                data: media_data,
                                mime: media_mime,
                            },
                        ],
                    }),
                }
            );

            const responseText = await response.text();

            try {
                const result = JSON.parse(responseText);
                await prisma.waHook.create({
                    data: {
                        data: JSON.stringify({
                            question: message.text,
                            name: message.contact?.name,
                            number: message.from,
                            answer: result.text,
                            flowId: flow.defaultFlow,
                        }),
                    },
                });

                if (flow.waPhoneNumberId && flow.waToken && flow.active) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await client.sendText(message.from, result.text);
                }
            } catch (error) {
                logger.error(`[POST] Error parsing AI response ${error}`);
                logger.error(responseText);
            }
        } catch (error) {
            logger.error(`[POST] Error calling flow API ${error}`);
        }
    }
}




const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})
    // ✅ Handle verifikasi Webhook (GET)
    .get(
        "/hook",
        async (ctx) => {
            const { query, set } = ctx;
            const mode = query["hub.mode"];
            const challenge = query["hub.challenge"];
            const verifyToken = query["hub.verify_token"];

            const getToken = await prisma.apiKey.findUnique({
                where: { key: verifyToken },
            });

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
        },
        {
            query: t.Object({
                ["hub.mode"]: t.Optional(t.String()),
                ["hub.verify_token"]: t.Optional(t.String()),
                ["hub.challenge"]: t.Optional(t.String()),
            }),
            detail: {
                summary: "Webhook Verification",
                description: "Verifikasi dari WhatsApp API",
            },
        }
    )

    // ✅ Handle incoming message (POST)
    .post(
        "/hook",
        async ({ body }) => {
            const webhook = client.parseWebhook(body);

            logger.info(`[POST] Webhook Type: ${webhook[0]?.type}`);
            console.log("ada data masuk ...", webhook[0]?.type)

            if (webhook[0]?.type === WhatsAppMessageType.TEXT) {
                const messageQuestion = webhook[0]?.text;
                const from = webhook[0]?.from;
                const name = webhook[0]?.contact?.name;

                if (messageQuestion && from) {
                    logger.info(
                        `[POST] Message: ${JSON.stringify({ message: messageQuestion, from, name })}`
                    );
                    // gunakan void agar tidak ada warning “unawaited promise”
                    void flowAiText({
                        message: webhook[0],
                    });
                }

            }

            if (webhook[0]?.type === WhatsAppMessageType.IMAGE || webhook[0]?.type === WhatsAppMessageType.DOCUMENT || webhook[0]?.type === WhatsAppMessageType.STICKER) {
                const messageQuestion = webhook[0]?.text;
                const from = webhook[0]?.from;
                const name = webhook[0].contact?.name;
                const message = webhook[0];

                if (from) {
                    logger.info(
                        `[POST] Message: ${JSON.stringify({ message: messageQuestion, from, name })}`
                    );

                    const buffer = await client.downloadMedia(message.media?.id!);
                    const media_data = buffer.toString("base64");
                    const media_name = message.media?.filename || "default_filename";
                    const media_mime = message.media?.mime_type || "default_mime_type";
                    
                    // gunakan void agar tidak ada warning “unawaited promise"
                    void flowAiImage({
                        message,
                        media_data: `data:${media_mime};base64,${media_data}`,
                        media_name,
                        media_mime,
                    });
                }
            }

            return {
                success: true,
                message: "WhatsApp Hook received",
            };
        },
        {
            body: t.Any(),
            detail: {
                summary: "Receive WhatsApp Messages",
                description: "Menerima pesan dari WhatsApp Webhook",
            },
        }
    )

    // ✅ List WhatsApp Hook
    .get(
        "/list",
        async ({ query }) => {
            const limit = query.limit ?? 10;
            const page = query.page ?? 1;

            const list = await prisma.waHook.findMany({
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { createdAt: "desc" },
            });

            const count = await prisma.waHook.count();
            const result = list.map((item) => ({
                id: item.id,
                data: item.data as WAHookMessage,
                createdAt: item.createdAt,
            }));

            return {
                list: result,
                count: Math.ceil(count / limit),
            };
        },
        {
            query: t.Object({
                page: t.Optional(t.Number({ minimum: 1, default: 1 })),
                limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
            }),
            detail: {
                summary: "List WhatsApp Hook",
                description: "List semua WhatsApp Hook",
            },
        }
    )

    // ✅ Reset WhatsApp Hook
    .post(
        "/reset",
        async () => {
            await prisma.waHook.deleteMany();
            return {
                success: true,
                message: "WhatsApp Hook reset",
            };
        },
        {
            detail: {
                summary: "Reset WhatsApp Hook",
                description: "Reset semua WhatsApp Hook",
            },
        }
    );

export default WaHookRoute;
