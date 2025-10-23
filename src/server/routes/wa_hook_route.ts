import Elysia, { t } from "elysia";
import { prisma } from "../lib/prisma";
import type { WAHookMessage } from "types/wa_messages";
import _ from "lodash";
import { logger } from "../lib/logger";


import { WhatsAppClient, WhatsAppMessageType } from 'whatsapp-client-sdk';

const client = new WhatsAppClient({
    accessToken: process.env.WA_TOKEN!,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID!,
    webhookVerifyToken: process.env.WA_WEBHOOK_TOKEN!

});


async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = 120_000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(input, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(id)
    }
}

async function flowAi({ question, name, number }: { question: string, name: string, number: string }) {

    const flow = await prisma.chatFlows.findUnique({
        where: {
            id: "1",
        },
    })

    if (!flow) {
        logger.info("[POST] no flow found")
    }

    if (flow?.defaultFlow && flow.active) {
        const { flowUrl, flowToken } = flow
        const response = await fetchWithTimeout(`${flowUrl}/prediction/${flow.defaultFlow}`, {
            headers: {
                Authorization: `Bearer ${flowToken}`,
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                question,
                overrideConfig: {
                    sessionId: `${_.kebabCase(name)}_x_${number}`,
                    vars: { userName: _.kebabCase(name), userPhone: number },
                },
            }),
        })

        const responseText = await response.text()
        try {
            const result = JSON.parse(responseText)
            const create = await prisma.waHook.create({
                data: {
                    data: JSON.stringify({
                        question,
                        name,
                        number,
                        answer: result.text,
                        flowId: flow.defaultFlow,
                    }),
                },
            });

            if (flow?.waPhoneNumberId && flow?.waToken && flow.active) {
                client.sendText(number, result.text)
            }

        } catch (error) {
            console.log(error)
            console.log(responseText)
        }
    }

}

const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})
    // ✅ Handle verifikasi Webhook (GET)
    .get("/hook", async (ctx) => {
        const { query, set } = ctx;
        const mode = query["hub.mode"];
        const challenge = query["hub.challenge"];
        const verifyToken = query["hub.verify_token"];

        const getToken = await prisma.apiKey.findUnique({
            where: {
                key: verifyToken,
            }
        });

        console.log(getToken);

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
    }, {
        query: t.Object({
            ["hub.mode"]: t.Optional(t.String()),
            ["hub.verify_token"]: t.Optional(t.String()),
            ["hub.challenge"]: t.Optional(t.String())
        }),
        detail: {
            summary: "Webhook Verification",
            description: "Verifikasi dari WhatsApp API",
        }
    })

    // ✅ Handle incoming message (POST)
    .post("/hook", async ({ body }) => {

        const webhook = client.parseWebhook(body)

        if (webhook[0]?.type === WhatsAppMessageType.TEXT) {
            const message = webhook[0]?.text
            const from = webhook[0]?.from
            const name = webhook[0].contact?.name

            if (message && from) {
                logger.info(`[POST] Message: ${JSON.stringify({
                    message,
                    from,
                    name
                })}`)
                flowAi({
                    question: message,
                    name: name || "default_name",
                    number: from,
                })
            }
        }

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
    })
    .get("/list", async ({ query }) => {
        const list = await prisma.waHook.findMany({
            take: query.limit,
            skip: ((query.page || 1) - 1) * (query.limit || 10),
            orderBy: {
                createdAt: "desc",
            },
        });

        const count = await prisma.waHook.count()
        const result = list.map((item) => ({
            id: item.id,
            data: item.data as WAHookMessage,
            createdAt: item.createdAt,
        }))

        return {
            list: result,
            count: Math.ceil(count / (query.limit || 10)),
        };
    }, {
        query: t.Object({
            page: t.Optional(t.Number({ minimum: 1, default: 1 })),
            limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
        }),
        detail: {
            summary: "List WhatsApp Hook",
            description: "List semua WhatsApp Hook",
        }
    })
    .post("/reset", async () => {
        await prisma.waHook.deleteMany()
        return {
            success: true,
            message: "WhatsApp Hook reset"
        };
    }, {
        detail: {
            summary: "Reset WhatsApp Hook",
            description: "Reset semua WhatsApp Hook",
        }
    });

export default WaHookRoute;
