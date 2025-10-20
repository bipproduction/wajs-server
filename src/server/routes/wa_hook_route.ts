import Elysia, { t } from "elysia";

const WaHookRoute = new Elysia({
    prefix: "/wa-hook",
    tags: ["WhatsApp Hook"],
})

    .post("/hook", async (ctx) => {
        const { body } = ctx.body;

        console.log(body);
        return {
            success: true,
            message: "WhatsApp Hook received"
        };
    }, {
        body: t.Any(),
        detail: {
            summary: "WhatsApp Hook",
            description: "WhatsApp Hook",
        },
    })

export default WaHookRoute;