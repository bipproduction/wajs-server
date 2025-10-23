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
  Divider,
} from "@mantine/core";
import { useLocalStorage, useShallowEffect } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import {
  IconRefresh,
  IconMessageCircle,
  IconUser,
  IconCalendar,
  IconHash,
  IconCode,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import useSWR from "swr";

export default function WaHookHome() {
  const [page, setPage] = useLocalStorage({ key: "wa-hook-page", defaultValue: 1 });
  const { data, error, isLoading, mutate } = useSWR(
    `/wa-hook?page=${page}`,
    () => apiFetch["wa-hook"].list.get({ query: { page, limit: 10 } }),
    {
      refreshInterval: 4000,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    }
  );

  useShallowEffect(() => {
    mutate();
  }, [page]);

  async function handleReset() {
    await apiFetch["wa-hook"].reset.post();
    mutate();
    showNotification({
      title: "Reset Completed",
      message: "All WhatsApp Hook data has been cleared.",
      color: "teal",
    });
  }

  if (isLoading) return <Skeleton height={600} radius="lg" />;
  if (error)
    return (
      <Container p="xl">
        <Text c="red.5" ta="center" fz="lg" fw={500}>
          Failed to load webhook data.
        </Text>
      </Container>
    );

  return (
    <Container
      size="lg"
      p="xl"
      style={{
        background: "linear-gradient(145deg, #1a1a1a 0%, #111 100%)",
        borderRadius: 24,
        border: "1px solid rgba(0,255,200,0.15)",
        boxShadow: "0 0 30px rgba(0,255,200,0.1)",
      }}
    >
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={2} c="#EAEAEA" fw={700} style={{ letterSpacing: 0.5 }}>
              WhatsApp Hook Monitor
            </Title>
            <Text c="#9A9A9A" fz="sm">
              Real-time webhook activity and message tracking
            </Text>
          </Stack>
          <Tooltip label="Reset all webhook data" withArrow color="teal">
            <Button
              onClick={handleReset}
              leftSection={<IconRefresh size={18} />}
              variant="gradient"
              gradient={{ from: "#00FFC8", to: "#00FFFF", deg: 45 }}
              radius="xl"
              size="md"
            >
              Reset Data
            </Button>
          </Tooltip>
        </Group>

        <Divider color="rgba(0,255,200,0.2)" />

        {/* <pre>{JSON.stringify(data?.data?.list, null, 2)}</pre> */}

        <Stack gap="md">
          {data?.data?.list?.length ? (
            data.data.list.map((item) => {
              const parsed = JSON.parse((item.data as any) || "{}");

              return (
                <Card
                  key={item.id}
                  radius="lg"
                  p="lg"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(45,45,45,0.9) 0%, rgba(25,25,25,0.95) 100%)",
                    border: "1px solid rgba(0,255,200,0.25)",
                  }}
                >
                  <Stack gap={8}>
                    {/* Nama & Nomor Pengirim */}
                    <Group gap="xs" align="center">
                      <IconUser size={16} color="#00FFC8" />
                      <Text c="#EAEAEA" fw={500}>
                        {parsed.name || "Unknown Sender"} ({parsed.number || "No Number"})
                      </Text>
                    </Group>

                    {/* Pertanyaan / Pesan */}
                    <Group gap="xs" align="center">
                      <IconMessageCircle size={16} color="#00FFFF" />
                      <Text c="#9A9A9A" fz="sm">
                        {parsed.question || "(No question)"}
                      </Text>
                    </Group>

                    {/* ID Record */}
                    <Group gap="xs" align="center">
                      <IconHash size={16} color="#00FFC8" />
                      <Text c="#9A9A9A" fz="xs">
                        {item.id}
                      </Text>
                    </Group>

                    {/* Timestamp */}
                    <Group gap="xs" align="center">
                      <IconCalendar size={16} color="#00FFFF" />
                      <Text c="#9A9A9A" fz="xs">
                        {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                      </Text>
                    </Group>

                    {/* Flow ID */}
                    {parsed.flowId && (
                      <Group gap="xs" align="center">
                        <IconCode size={16} color="#B554FF" />
                        <Badge
                          color="grape"
                          radius="sm"
                          variant="light"
                          styles={{
                            root: { backgroundColor: "rgba(181,84,255,0.15)", color: "#EAEAEA" },
                          }}
                        >
                          Flow: {parsed.flowId}
                        </Badge>
                      </Group>
                    )}

                    {/* Jawaban */}
                    {parsed.answer && (
                      <Card
                        p="sm"
                        radius="md"
                        style={{
                          backgroundColor: "rgba(45,45,45,0.7)",
                          border: "1px solid rgba(0,255,255,0.15)",
                        }}
                      >
                        <Stack gap={4}>
                          <Text c="#EAEAEA" fw={500} fz="sm">
                            Bot Answer
                          </Text>
                          <Text c="#EAEAEA" fz="sm">
                            {parsed.answer}
                          </Text>
                        </Stack>
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
                padding: 60,
              }}
            >
              <Text c="#9A9A9A" fz="lg">
                No webhook activity detected yet.
              </Text>
            </Card>
          )}

        </Stack>

        <Group justify="center" mt="xl">
          <Pagination
            value={page}
            total={Math.ceil((data?.data?.count || 1) / 10)}
            onChange={(value) => {
              setPage(value);
              mutate();
            }}
            radius="xl"
            withEdges
            color="teal"
            size="md"
            styles={{
              control: {
                backgroundColor: "#2D2D2D",
                border: "1px solid rgba(0,255,200,0.15)",
                color: "#EAEAEA",
              },
            }}
          />
        </Group>
      </Stack>
    </Container>
  );
}
