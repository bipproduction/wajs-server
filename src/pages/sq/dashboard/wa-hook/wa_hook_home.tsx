import apiFetch from "@/lib/apiFetch";
import {
  Button,
  Card,
  Container,
  Group,
  Pagination,
  Skeleton,
  Stack,
  Text,
  Title,
  Badge,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage, useShallowEffect } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconRefresh, IconMessageCircle, IconUser, IconCalendar, IconHash, IconCode } from "@tabler/icons-react";
import dayjs from "dayjs";
import useSWR from "swr";

export default function WaHookHome() {
  const [page, setPage] = useLocalStorage({ key: "wa-hook-page", defaultValue: 1 });
  const { data, error, isLoading, mutate } = useSWR(
    "/wa-hook",
    () => apiFetch["wa-hook"].list.get({ query: { page, limit: 10 } }),
    {
      refreshInterval: 4000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 3000,
    }
  );

  useShallowEffect(() => {
    mutate();
    setPage(data?.data?.list?.length || 1);
  }, []);

  async function handleReset() {
    await apiFetch["wa-hook"].reset.post();
    mutate();
    showNotification({
      title: "Reset Completed",
      message: "WhatsApp Hook data has been successfully reset.",
      color: "teal",
    });
  }

  if (isLoading) return <Skeleton height={500} radius="lg" />;
  if (error)
    return (
      <Container p="xl">
        <Text c="red.5" ta="center" fz="lg" fw={500}>
          Failed to load data: {error.message}
        </Text>
      </Container>
    );

  return (
    <Container size="lg" p="lg" style={{ backgroundColor: "#191919", borderRadius: 20 }}>
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Title order={2} c="#EAEAEA" fw={700} style={{ letterSpacing: 0.5 }}>
            WhatsApp Hook Monitor
          </Title>
          <Tooltip label="Reset all webhook data" withArrow color="teal">
            <Button
              onClick={handleReset}
              leftSection={<IconRefresh size={18} />}
              variant="gradient"
              gradient={{ from: "#00FFC8", to: "#00FFFF", deg: 45 }}
              radius="xl"
            >
              Reset
            </Button>
          </Tooltip>
        </Group>

        <ScrollArea style={{ height: 600 }}>
          <Stack gap="md">
            {data?.data?.list?.length ? (
              data.data.list.map((item) => {
                const msg = item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
                const contact = item.data?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
                const answer = (item.data as any)?.answer;
                return (
                  <Card
                    key={item.id}
                    radius="lg"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(45,45,45,0.8) 0%, rgba(25,25,25,0.95) 100%)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(0,255,200,0.2)",
                      boxShadow: "0 0 10px rgba(0,255,200,0.15)",
                    }}
                  >
                    <Stack gap={6}>
                      <Group gap="xs">
                        <IconUser size={16} color="#00FFC8" />
                        <Text c="#EAEAEA" fw={500}>
                          {contact?.profile?.name || "Unknown"}
                        </Text>
                      </Group>

                      <Group gap="xs">
                        <IconMessageCircle size={16} color="#00FFFF" />
                        <Text c="#9A9A9A">{msg?.text?.body || "(No message body)"}</Text>
                      </Group>

                      <Group gap="xs">
                        <IconHash size={16} color="#00FFC8" />
                        <Text c="#9A9A9A" fz="sm">
                          {msg?.id}
                        </Text>
                      </Group>

                      <Group gap="xs">
                        <IconCalendar size={16} color="#00FFFF" />
                        <Text c="#9A9A9A" fz="sm">
                          {dayjs(Number(msg?.timestamp) * 1000).format("YYYY-MM-DD HH:mm:ss")}
                        </Text>
                      </Group>

                      <Group gap="xs">
                        <IconCode size={16} color="#B554FF" />
                        <Badge color="grape" radius="sm" variant="light">
                          {msg?.type || "Unknown"}
                        </Badge>
                      </Group>

                      {answer && (
                        <Card
                          p="sm"
                          radius="md"
                          style={{
                            backgroundColor: "#2D2D2D",
                            border: "1px solid rgba(0,255,255,0.1)",
                          }}
                        >
                          <Text c="#EAEAEA" fz="sm">
                            {JSON.stringify(answer, null, 2)}
                          </Text>
                        </Card>
                      )}
                    </Stack>
                  </Card>
                );
              })
            ) : (
              <Card
                radius="lg"
                style={{
                  backgroundColor: "#2D2D2D",
                  border: "1px solid rgba(0,255,255,0.1)",
                  textAlign: "center",
                  padding: 40,
                }}
              >
                <Text c="#9A9A9A" fz="lg">
                  No webhook data available yet.
                </Text>
              </Card>
            )}
          </Stack>
        </ScrollArea>

        <Group justify="center" mt="md">
          <Pagination
            value={page}
            total={data?.data?.count || 1}
            onChange={(value) => {
              setPage(value);
              mutate();
            }}
            radius="xl"
            withEdges
            color="teal"
          />
        </Group>
      </Stack>
    </Container>
  );
}
