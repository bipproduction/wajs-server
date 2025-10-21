/* eslint-disable @typescript-eslint/no-explicit-any */
import Elysia, { t } from 'elysia'
import { prisma } from '../lib/prisma'
import _ from 'lodash'

const getUrlToken = async () => await prisma.chatFlows.findUnique({ where: { id: "1" }, select: { flowUrl: true, flowToken: true } })

const FlowRoute = new Elysia({
  prefix: '/chatflows',
  detail: { tags: ['chatflows'] },
})
  .get('/sync', async ctx => {
    const result = await getUrlToken()
    if (!result) {
      return { error: 'Flow URL and Token not found' }
    }
    const { flowUrl, flowToken } = result
    const response = await fetch(flowUrl + '/chatflows', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + flowToken,
        Accept: '*/*',
      },
    })

    if (!response.ok) {
      return { error: 'Failed to fetch flows' }
    }

    const data = await response.json()

    const chatflows = await prisma.chatFlows.upsert({
      where: {
        id: "1",
      },
      update: {
        flows: data,
      },
      create: {
        flows: data,
      },
    })
    return { data: chatflows }
  }, {
    detail: {
      summary: "Sync chatflows",
      description: "Sync chatflows",
    }
  })
  .get('/find', async ctx => {
    const result = await prisma.chatFlows.findUnique({
      where: { id: "1" },
    })
    if (!result) {
      return { flows: [], defaultFlow: null, flowUrl: null, flowToken: null }
    }
    const flows = _.orderBy(result?.flows as any[], ['type'], ['asc'])
    const defaultFlow = result?.defaultFlow
    const flowUrl = result?.flowUrl
    const flowToken = result?.flowToken
    return { flows, defaultFlow, flowUrl, flowToken }
  }, {
    detail: {
      summary: "Find chatflows",
      description: "Find chatflows",
    }
  })
  .get("/default", async ctx => {
    const result = await prisma.chatFlows.findUnique({
      where: { id: "1" },
    })
    if (!result) {
      return { defaultFlow: null, defaultData: null }
    }
    const defaultFlow = result?.defaultFlow
    const defaultData = result?.defaultData
    return { defaultFlow, defaultData }
  }, {
    detail: {
      summary: "Get default chatflows",
      description: "Get default chatflows",
    }
  })
  .put(
    '/default',
    async ctx => {
      const { id } = ctx.body

      const result = await prisma.chatFlows.update({
        where: {
          id: "1",
        },
        data: {
          defaultFlow: id
        },
      })
      return { data: result }
    },
    {
      body: t.Object({
        id: t.String()
      }),
      detail: {
        summary: "Update default chatflows",
        description: "Update default chatflows",
      }
    }
  )
  .post(
    '/query',
    async ctx => {
      const { flowId, question } = ctx.body
      const result = await chatFlowQuery({ flowId, question })
      return { data: result }
    },
    {
      body: t.Object({
        flowId: t.String(),
        question: t.String(),
      }),
      detail: {
        summary: "Query chatflows",
        description: "Query chatflows",
      }
    }
  )
  .put(
    '/flow-active',
    async ctx => {
      const { active } = ctx.body
      const result = await prisma.chatFlows.upsert({
        where: {
          id: "1",
        },
        update: {
          active: active,
        },
        create: {
          active: active,
        },
      })
      return { data: result }
    },
    {
      body: t.Object({
        active: t.Boolean(),
      }),
      detail: {
        summary: "Update flow active",
        description: "Update flow active",
      }
    }
  )
  .get('/url-token', async ctx => {
    const result = await prisma.chatFlows.findUnique({
      where: { id: "1" },
      select: {
        flowUrl: true,
        flowToken: true,
        waPhoneNumberId: true,
        waToken: true,
      },
    })
    if (!result) {
      return { data: { flowUrl: null, flowToken: null, waPhoneNumberId: null, waToken: null } }
    }
    return { data: { flowUrl: result.flowUrl, flowToken: result.flowToken, waPhoneNumberId: result.waPhoneNumberId, waToken: result.waToken } }
  }, {
    detail: {
      summary: "Get flow url and token",
      description: "Get flow url and token",
    }
  })
  .put(
    '/url-token',
    async ctx => {
      const { flowUrl, flowToken, waPhoneNumberId, waToken } = ctx.body
      const result = await prisma.chatFlows.upsert({
        where: {
          id: "1",
        },
        update: {
          flowUrl: flowUrl,
          flowToken: flowToken,
          waPhoneNumberId: waPhoneNumberId,
          waToken: waToken,
        },
        create: {
          id: "1",
          flowUrl: flowUrl,
          flowToken: flowToken,
          waPhoneNumberId: waPhoneNumberId,
          waToken: waToken,
        },
      })
      return { data: result }
    },
    {
      body: t.Object({
        flowUrl: t.String(),
        flowToken: t.String(),
        waPhoneNumberId: t.String(),
        waToken: t.String(),
      }),
      detail: {
        summary: "Update flow url and token",
        description: "Update flow url and token",
      }
    }
  )
  .on('error', ctx => {
    console.log(ctx.error)
    return { error: ctx.error }
  })

export default FlowRoute

async function chatFlowQuery({
  flowId,
  question,
}: {
  flowId: string
  question: string
}) {
  try {
    const resultUrlToken = await prisma.chatFlows.findUnique({ where: { id: "1" }, select: { flowUrl: true, flowToken: true } })
    if (!resultUrlToken) {
      return { error: 'Flow URL and Token not found' }
    }
    const { flowUrl, flowToken } = resultUrlToken
    if (!flowUrl || !flowToken) {
      return { error: 'Flow URL and Token not found' }
    }
    const response = await fetch(`${flowUrl}/prediction/${flowId}`, {
      headers: {
        Authorization: `Bearer ${flowToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        question,
        overrideConfig: {
          sessionId: "1",
        },
      }),
    })
    const result = await response.text()
    return JSON.parse(result).text
  } catch (error) {
    console.log(error)
    return 'Failed to fetch response'
  }
}
