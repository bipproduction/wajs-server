import Elysia, { t } from "elysia";
import { prisma } from "../lib/prisma";

const WebhookRoute = new Elysia({
    prefix: "/webhook",
    tags: ["Webhook"]
})
    .post("/create", async (ctx) => {
        const { name, description, url, method, headers, payload, apiToken, enabled, replay, replayKey } = ctx.body;

        await prisma.webHook.create({
            data: {
                name,
                description,
                url,
                method,
                headers: headers,
                payload: payload,
                apiToken,
                enabled,
                replay,
                replayKey,
            },
        });
        return {
            success: true,
            message: "Webhook route created",
        };
    }, {
        body: t.Object({
            name: t.String(),
            description: t.String(),
            url: t.String(),
            method: t.String(),
            headers: t.String(),
            payload: t.String(),
            apiToken: t.String(),
            enabled: t.Boolean(),
            replay: t.Boolean(),
            replayKey: t.String(),
        }),
        detail: {
            summary: "Create webhook",
            description: "Create webhook route with live preview code",
        },
    })
    .get("/list", async (ctx) => {
        const webhooks = await prisma.webHook.findMany();
        return {
            list: webhooks,
        };
    }, {
        detail: {
            summary: "List webhooks",
            description: "List all webhooks",
        },
    })
    .get("/find/:id", async (ctx: { params: { id: string } }) => {
        const webhook = await prisma.webHook.findUnique({
            where: {
                id: ctx.params.id,
            },
            select: {
                id: true,
                name: true,
                description: true,
                url: true,
                method: true,
                headers: true,
                apiToken: true,
                enabled: true,
            }
        });
        return {
            webhook,
        };
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            summary: "Find webhook",
            description: "Find webhook by id",
        },
    })
    .delete("/remove/:id", async (ctx: { params: { id: string } }) => {
        await prisma.webHook.delete({
            where: {
                id: ctx.params.id,
            },
        });
        return {
            success: true,
            message: "Webhook route removed",
        };
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            summary: "Remove webhook",
            description: "Remove webhook by id",
        },
    })
    .put("/update/:id", async (ctx) => {
        const { name, description, url, method, headers, apiToken, enabled } = ctx.body;
        await prisma.webHook.update({
            where: {
                id: ctx.params.id,
            },
            data: {
                name,
                description,
                url,
                method,
                headers: headers,
                apiToken,
                enabled,    
            },
        });
        return {
            success: true,
            message: "Webhook route updated",
        };
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            name: t.String(),
            description: t.String(),
            url: t.String(),
            method: t.String(),
            headers: t.String(),
            apiToken: t.String(),
            enabled: t.Boolean(),
        }),
        detail: {
            summary: "Update webhook",
            description: "Update webhook by id",
        },
    })
    .onError((ctx) => {
        console.log(ctx.error);
        return {
            success: false,
            message: ctx.error,
        };
    });

export default WebhookRoute;
