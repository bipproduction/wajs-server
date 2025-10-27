import Elysia, { t } from "elysia";
import { startClient, getState } from "../lib/wa/wa_service";
import _ from "lodash";

const WaRoute = new Elysia({
    prefix: "/wa",
    tags: ["WhatsApp"]
})
    .post("/start", async () => {
        startClient();
        return {
            message: "WhatsApp route started",
        };
    })
    .get("/qr", () => {
        const state = getState();
        return {
            qr: state.qr,
        };
    })
    .get("/ready", () => {
        const state = getState();
        return {
            ready: state.ready,
        };
    })
    .post("/restart", async () => {
        getState().restart();
        return {
            message: "WhatsApp route restarted",
        };
    })
    .post("/force-start", async () => {
        getState().forceStart();
        return {
            message: "WhatsApp route force started",
        };
    })
    .post("/stop", async () => {
        getState().stop();
        return {
            message: "WhatsApp route stopped",
        };
    })
    .get("/state", () => {
        const state = getState();
        return {
            state: _.omit(state, "client"),
        };
    })
    .post("send-text", async ({body}) => {
        const state = getState();
        if (!state.ready) {
            return {
                message: "WhatsApp route not ready",
            };
        }

        const client = state.client;
        if (!client) {
            return {
                message: "WhatsApp client not ready",
            };
        }
        
        
        const chat = await client.getChatById(`${body.number}@c.us`);
        await chat.sendMessage(body.text);

        return {
            message: "WhatsApp route ready",
        };
    },{
        body: t.Object({
            number: t.String(),
            text: t.String(),
        }),
        detail: {
            description: "Send text to WhatsApp",
            tags: ["WhatsApp"],
        }
    })

export default WaRoute;
