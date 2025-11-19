import clientRoutes from "@/clientRoutes";
import apiFetch from "@/lib/apiFetch";
import {
  Button,
  Checkbox,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useShallowEffect } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCode, IconX } from "@tabler/icons-react";
import type { WebHook } from "generated/prisma";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useSWR from "swr";

export default function WebhookEdit() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const { data, error, isLoading, mutate } = useSWR(
    "/",
    () =>
      apiFetch.api.webhook
        .find({
          id: id!,
        })
        .get(),
    { dedupingInterval: 3000 },
  );
  const navigate = useNavigate();

  useShallowEffect(() => {
    mutate();
  }, [data]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data?.data?.webhook) return <div>No data</div>;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Edit Webhook</Title>
        <Button
          variant="outline"
          onClick={() => {
            modals.openConfirmModal({
              title: "Remove Webhook",
              children: (
                <Text>Are you sure you want to remove this webhook?</Text>
              ),
              confirmProps: { color: "red" },
              labels: {
                cancel: "Cancel",
                confirm: "Remove",
              },
              onConfirm: () => {
                apiFetch.api.webhook
                  .remove({
                    id: id!,
                  })
                  .delete();
                navigate(clientRoutes["/sq/dashboard/webhook"]);
              },
              onCancel: () => {
                navigate(
                  clientRoutes["/sq/dashboard/webhook/webhook-edit"] +
                    "?id=" +
                    id,
                );
              },
            });
          }}
        >
          Remove
        </Button>
      </Group>
      <EditView webhook={data.data?.webhook || null} />
    </Stack>
  );
}

function EditView({ webhook }: { webhook: Partial<WebHook> | null }) {
  const navigate = useNavigate();
  const [name, setName] = useState(webhook?.name || "");
  const [description, setDescription] = useState(webhook?.description || "");
  const [url, setUrl] = useState(webhook?.url || "");
  const [method, setMethod] = useState(webhook?.method || "POST");
  const [headers, setHeaders] = useState(webhook?.headers || "{}");

  const [apiToken, setApiToken] = useState(webhook?.apiToken || "");
  const [enabled, setEnabled] = useState(webhook?.enabled );


  async function onSubmit() {
    if (!webhook?.id) {
      return notifications.show({
        title: "Webhook ID Not Found",
        message: "Unable to update webhook",
        color: "red",
        icon: <IconX />,
      });
    }
    const { data } = await apiFetch.api.webhook
      .update({
        id: webhook?.id,
      })
      .put({
        name,
        description,
        apiToken,
        url,
        method,
        headers,
        enabled: enabled || false,
      });

    if (data?.success) {
      notifications.show({
        title: "Webhook Created",
        message: data.message,
        color: "teal",
        icon: <IconCheck />,
      });
      navigate(clientRoutes["/sq/dashboard/webhook"]);
    } else {
      notifications.show({
        title: "Creation Failed",
        message: data?.message || "Unable to create webhook",
        color: "red",
        icon: <IconX />,
      });
    }
  }

  return (
    <Stack style={{ backgroundColor: "#191919" }} p="xl">
      <Stack
        gap="md"
        w={"100%"}
        mx="auto"
        bg="rgba(45,45,45,0.6)"
        p="xl"
        style={{
          borderRadius: "20px",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,255,200,0.2)",
          //   boxShadow: "0 0 25px rgba(0,255,200,0.15)",
        }}
      >
        <Group justify="space-between">
          <Title order={2} c="#EAEAEA" fw={600}>
            Edit Webhook
          </Title>
          <IconCode color="#00FFFF" size={28} />
        </Group>

        <Divider color="rgba(0,255,200,0.2)" />

        <TextInput
          label="Name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextInput
          label="Description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TextInput
          label="Webhook URL"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <Select
          label="HTTP Method"
          placeholder="Select method"
          value={method}
          onChange={(v) => setMethod(v || "POST")}
          data={["POST", "GET", "PUT", "PATCH", "DELETE"].map((v) => ({
            value: v,
            label: v,
          }))}
        />

        <TextInput
          label="API Token"
          placeholder="Bearer ..."
          value={apiToken}
          onChange={(e) => {
            setApiToken(e.target.value);
            try {
              const current = JSON.parse(headers);
              if (!e.target.value) {
                delete current["Authorization"];
              } else {
                current["Authorization"] = `Bearer ${e.target.value}`;
              }
              setHeaders(JSON.stringify(current, null, 2));
            } catch {}
          }}
        />

        {/* <Stack gap="xs">
          <Text fw={600} c="#EAEAEA">
            Headers (JSON)
          </Text>
          <Editor
            theme="vs-dark"
            height="20vh"
            language="json"
            value={headers}
            onChange={(val) => setHeaders(val ?? "{}")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              lineNumbers: "off",
              automaticLayout: true,
            }}
          />
        </Stack> */}

        {/* <Stack gap="xs">
          <Text fw={600} c="#EAEAEA">
            Payload
          </Text>
          <Text size="xs" c="#9A9A9A" mb="xs">
            {templateData}
          </Text>
          <Editor
            theme="vs-dark"
            height="35vh"
            language="json"
            value={payload}
            onChange={(val) => setPayload(val ?? "{}")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </Stack> */}
        <Checkbox
          label="Enable Webhook"
          defaultChecked={enabled}
          onChange={(e) => setEnabled(e.target.checked as any)}
          color="teal"
          styles={{
            label: { color: "#EAEAEA" },
          }}
        />

        {/* <Checkbox
          label="Enable Replay"
          checked={replay}
          onChange={(e) => setReplay(e.target.checked as any)}
          color="teal"
          styles={{
            label: { color: "#EAEAEA" },
          }}
        /> */}

        {/* <TextInput
          description="Replay Key is used to identify the webhook example: data.text"
          label="Replay Key"
          placeholder="Replay Key"
          value={replayKey}
          onChange={(e) => setReplayKey(e.target.value)}
        /> */}

        {/* <Card
          radius="xl"
          p="md"
          style={{
            background: "rgba(25,25,25,0.6)",
            border: "1px solid rgba(0,255,200,0.3)",
            // boxShadow: "0 0 15px rgba(0,255,200,0.15)",
          }}
        >
          <Stack gap="xs">
            <Text fw={600} c="#EAEAEA">
              Request Preview
            </Text>
            <Editor
              theme="vs-dark"
              height="35vh"
              language="javascript"
              value={previewCode}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </Stack>
        </Card> */}

        <Group justify="flex-end" mt="md">
          <Button
            onClick={() => navigate(clientRoutes["/sq/dashboard/webhook"])}
            variant="subtle"
            c="#EAEAEA"
            styles={{
              root: { backgroundColor: "#2D2D2D", borderColor: "#00FFC8" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            style={{
              background: "linear-gradient(90deg, #00FFC8, #00FFFF)",
              color: "#191919",
            }}
          >
            Save Webhook
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}
