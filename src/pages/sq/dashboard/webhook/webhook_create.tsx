import { useState, useMemo } from "react";
import {
    Button,
    Card,
    Checkbox,
    Group,
    Stack,
    Text,
    TextInput,
    Select,
    Divider,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCode, IconCheck, IconX } from "@tabler/icons-react";
import Editor from "@monaco-editor/react";
import apiFetch from "@/lib/apiFetch";
import { useNavigate } from "react-router-dom";
import clientRoutes from "@/clientRoutes";

// data.from': data.from,
// data.fromNumber': data.fromNumber,
// data.fromMe': data.fromMe,
// data.body': data.body,
// data.hasMedia': data.hasMedia,
// data.type': data.type,
// data.to': data.to,
// data.deviceType': data.deviceType,
// data.notifyName': data.notifyName,
// data.media.data': data.media?.data ?? null,
// data.media.mimetype': data.media?.mimetype ?? null,
// data.media.filename': data.media?.filename ?? null,
// data.media.filesize': data.media?.filesize ?? 0,

const templateData = `
Available variables:
{{data.from}}, {{data.fromNumber}}, {{data.fromMe}}, {{data.body}}, {{data.hasMedia}}, {{data.type}}, {{data.to}}, {{data.deviceType}}, {{data.notifyName}}, {{data.media.data}}, {{data.media.mimetype}}, {{data.media.filename}}, {{data.media.filesize}}
`;

export default function WebhookCreate() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");
    const [method, setMethod] = useState("POST");
    const [headers, setHeaders] = useState(
        JSON.stringify({ "Content-Type": "application/json" }, null, 2),
    );
    const [payload, setPayload] = useState("{}");
    const [apiToken, setApiToken] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [replay, setReplay] = useState(false);
    const [replayKey, setReplayKey] = useState("");

    const safeJson = (value: string) => {
        try {
            return JSON.stringify(JSON.parse(value || "{}"), null, 2);
        } catch {
            return value || "{}";
        }
    };

    const previewCode = useMemo(() => {
        let headerObj: Record<string, string> = {};
        try {
            headerObj = JSON.parse(headers);
        } catch { }
        if (apiToken) headerObj["Authorization"] = `Bearer ${apiToken}`;
        const prettyHeaders = safeJson(JSON.stringify(headerObj));
        const prettyPayload = safeJson(payload);
        const includeBody = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());

        return `fetch("${url || "https://example.com/webhook"}", {
  method: "${method}",
  headers: ${prettyHeaders},${includeBody ? `\n  body: ${prettyPayload},` : ""}
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);`;
    }, [url, method, headers, payload, apiToken]);

    async function onSubmit() {
        const { data } = await apiFetch.api.webhook.create.post({
            name,
            description,
            apiToken,
            url,
            method,
            headers,
            payload,
            enabled,
            replay,
            replayKey,
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
                maw={900}
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
                        Create Webhook
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
                        } catch { }
                    }}
                    
                />

                <Stack gap="xs">
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
                </Stack>

                <Stack gap="xs">
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
                </Stack>

                <Checkbox
                    label="Enable Webhook"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.currentTarget.checked)}
                    color="teal"
                    styles={{
                        label: { color: "#EAEAEA" },
                    }}
                />
                <Checkbox
                    label="Enable Replay"
                    checked={replay}
                    onChange={(e) => setReplay(e.currentTarget.checked)}
                    color="teal"
                    styles={{
                        label: { color: "#EAEAEA" },
                    }}
                />
                <TextInput
                    description="Replay Key is used to identify the webhook example: data.text"
                    label="Replay Key"
                    placeholder="Replay Key"
                    value={replayKey}
                    onChange={(e) => setReplayKey(e.target.value)}
                    
                />

                <Card
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
                </Card>

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
