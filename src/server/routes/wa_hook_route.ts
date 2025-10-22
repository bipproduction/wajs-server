import Elysia, { t } from "elysia";
import { prisma } from "../lib/prisma";
import type { WAHookMessage } from "types/wa_messages";
import _ from "lodash";
import { Whatsapp, whatsappApiInit } from "../lib/wa-api/wa-api";
import type { GetParams, PostData } from "whatsapp-api-js/types";
import { logger } from "../lib/logger";

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = 120_000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(input, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(id)
    }
}

async function sendReplyMessage(to: string, message: string, phoneNumberId: string, token: string) {
    return await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            text: { body: message }
        })
    });
}


const allowedTypeMessage = ["text"]

const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})
    // ✅ Handle verifikasi Webhook (GET)
    .get("/hook", async (ctx) => {
        Whatsapp.get(ctx.query as GetParams)
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
        Whatsapp.post(body as PostData)
        logger.info("[POST] Incoming WhatsApp Webhook:", body)

        const create = await prisma.waHook.create({
            data: {
                data: body,
            },
        });

        const waHook = body as WAHookMessage
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
            const question = waHook?.entry[0]?.changes[0]?.value?.messages[0]?.text?.body
            const contacts = waHook?.entry[0]?.changes[0]?.value?.contacts[0]
            const name = contacts?.profile?.name
            const number = contacts?.wa_id

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
                let createData = create.data as any
                createData.answer = {
                    text: result.text,
                    type: "text",
                    flowId: flow.defaultFlow
                }

                await prisma.waHook.update({
                    where: {
                        id: create.id,
                    },
                    data: {
                        data: createData,
                    },
                })

                if (flow?.waPhoneNumberId && flow?.waToken && number) {
                    // await sendReplyMessage(number, result.text, flow.waPhoneNumberId, flow.waToken)
                }

            } catch (error) {
                console.log(error)
                console.log(responseText)
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

// Initialize WhatsApp API
// whatsappApiInit()