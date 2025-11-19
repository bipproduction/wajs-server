import { useMemo } from "react";
import {
  Card,
  Group,
  Text,
  Title,
  Badge,
  Loader,
  Center,
  Tooltip,
  ActionIcon,
  Stack,
  Divider,
  Button,
} from "@mantine/core";
import {
  IconLink,
  IconCode,
  IconKey,
  IconCheck,
  IconX,
  IconRefresh,
  IconEdit,
  IconPlus,
  IconMessageReply,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import useSWR from "swr";
import apiFetch from "@/lib/apiFetch";
import { useNavigate } from "react-router-dom";
import clientRoutes from "@/clientRoutes";
import { useShallowEffect } from "@mantine/hooks";

export default function WebhookHome() {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR(
    "/",
    apiFetch.api.webhook.list.get,
    { dedupingInterval: 3000, refreshInterval: 3000 },
  );

  const webhooks = useMemo(() => data?.data?.list ?? [], [data]);

  useShallowEffect(() => {
    mutate();
  }, []);

  function ButtonCreate() {
    return (
      <Tooltip label="Create new webhook" withArrow color="teal">
        <Button
          radius="xl"
          size="md"
          leftSection={<IconPlus size={18} />}
          variant="gradient"
          gradient={{ from: "#00FFC8", to: "#00FFFF", deg: 135 }}
          style={{
            color: "#191919",
            fontWeight: 600,
            // boxShadow: "0 0 12px rgba(0,255,200,0.25)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,200,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,255,200,0.25)";
          }}
          onClick={() => navigate("/sq/dashboard/webhook/webhook-create")}
        >
          Create Webhook
        </Button>
      </Tooltip>
    );
  }

  if (isLoading)
    return (
      <Center h="100vh" bg="#191919">
        <Loader color="teal" size="lg" />
      </Center>
    );

  if (error)
    return (
      <Center h="100vh" bg="#191919">
        <Text c="#FF4B4B" fw={500}>
          Failed to load webhooks. Please try again.
        </Text>
      </Center>
    );

  if (!webhooks.length)
    return (
      <Center h="100vh" bg="#191919">
        <Stack align="center" gap="sm">
          <Text c="#9A9A9A" size="lg">
            No webhooks found
          </Text>
          <Text c="#00FFC8" size="sm">
            Connect your first webhook to start managing events
          </Text>
          <ButtonCreate />
        </Stack>
      </Center>
    );

  return (
    <Stack style={{ backgroundColor: "#191919" }} p="xl">
      <Title order={2} c="#EAEAEA" fw={600}>
        Webhook Manager
      </Title>
      <Group justify="end" mb="lg">

        <ButtonCreate />
        <Tooltip label="Refresh webhooks" withArrow color="cyan">
          <ActionIcon
            variant="light"
            size="lg"
            radius="xl"
            onClick={() => {
              mutate();
              notifications.show({
                title: "Refreshing data",
                message: "Webhook list is being updated...",
                color: "teal",
              });
            }}
          >
            <IconRefresh color="#00FFFF" />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Stack gap="md">
        {webhooks.map((webhook) => (
          <Card
            key={webhook.id}
            p="lg"
            radius="xl"
            style={{
              background: "rgba(45,45,45,0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(0,255,200,0.2)",
              //   boxShadow: "0 0 12px rgba(0,255,200,0.15)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <Group justify="end" mb="sm">
              <Group>
                <IconLink color="#00FFFF" />
                <Text c="#EAEAEA" fw={500} size="lg">
                  {webhook.name}
                </Text>
              </Group>

              <ActionIcon
                c={"teal"}
                variant="light"
                size="lg"
                radius="xl"
                onClick={() =>
                  navigate(
                    `${clientRoutes["/sq/dashboard/webhook/webhook-edit"]}?id=${webhook.id}`,
                  )
                }
              >
                <IconEdit />
              </ActionIcon>
            </Group>

            <Stack gap={"md"}>
              <Group>
                <Badge
                  color={webhook.enabled ? "teal" : "red"}
                  radius="xl"
                  leftSection={
                    webhook.enabled ? (
                      <IconCheck size={14} />
                    ) : (
                      <IconX size={14} />
                    )
                  }
                >
                  {webhook.enabled ? "Active" : "Disabled"}
                </Badge>
                <Badge
                  bg={"teal"}
                  leftSection={<IconMessageReply size={16} color="#00FFC8" />}
                >
                  {webhook.replay ? "Replay" : "Not Replay"}
                </Badge>
              </Group>
              <Text c="#9A9A9A" size="sm">
                {webhook.description}
              </Text>
            </Stack>
            <Divider color="rgba(0,255,200,0.2)" my="sm" />

            <Stack gap="xs">
              <Group gap="xs">
                <IconCode size={16} color="#00FFC8" />
                <Text c="#9A9A9A" size="sm">
                  Method:
                </Text>
                <Text c="#EAEAEA" size="sm" fw={500}>
                  {webhook.method}
                </Text>
              </Group>

              <Group gap="xs">
                <IconLink size={16} color="#00FFC8" />
                <Text c="#9A9A9A" size="sm">
                  URL:
                </Text>
                <Text c="#EAEAEA" size="sm" fw={500}>
                  {webhook.url}
                </Text>
              </Group>

              <Group gap="xs">
                <IconKey size={16} color="#00FFC8" />
                <Text c="#9A9A9A" size="sm">
                  API Token:
                </Text>
                <Text c="#EAEAEA" size="sm" fw={500}>
                  {webhook.apiToken?.slice(0, 6) + "..." || "—"}
                </Text>
              </Group>

              {/* <Group gap="xs">
                <Text c="#9A9A9A" size="sm">
                  Headers:
                </Text>
                <Text c="#EAEAEA" size="sm" fw={500}>
                  {Object.keys(webhook.headers || {}).length
                    ? webhook.headers
                    : "No headers configured"}
                </Text>
              </Group> */}

              {/* <Group gap="xs">
                <Text c="#9A9A9A" size="sm">
                  Payload:
                </Text>
                <Text c="#EAEAEA" size="sm" fw={500}>
                  {Object.keys(webhook.payload || {}).length
                    ? webhook.payload
                    : "Empty payload"}
                </Text>
              </Group> */}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
