import apiFetch from "@/lib/apiFetch";
import { Button, Card, Group, Pagination, Skeleton, Stack, Text, Title } from "@mantine/core";
import { useLocalStorage, useShallowEffect } from "@mantine/hooks";
import dayjs from "dayjs";
import useSWR from "swr";
import { showNotification } from "@mantine/notifications";

export default function WaHookHome() {
  const [page, setPage] = useLocalStorage({
    key: "wa-hook-page",
    defaultValue: 1,
  })
  const { data, error, isLoading, mutate } = useSWR("/wa-hook", () => apiFetch["wa-hook"].list.get({ query: { page, limit: 10 } }), {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    refreshWhenHidden: true,
    refreshWhenOffline: true,
    dedupingInterval: 3000,
  })

  useShallowEffect(() => {
    mutate()
    setPage(data?.data?.list?.length || 1)
  }, [])

  async function reset() {
    await apiFetch["wa-hook"].reset.post()
    mutate()
    showNotification({ title: "Success", message: "WhatsApp Hook reset", color: "green" })
  }

  if (isLoading) return <Skeleton height={500} />
  if (error) return <div>Error: {error.message}</div>
  return (
    <Stack>
      <Title order={2}>WaHookHome</Title>
      <Group justify="flex-end">
        <Button onClick={reset}>Reset</Button>
      </Group>
      {data?.data?.list.map((item) => (
        <Card key={item.id}>
          <Stack>
            <Text>Name: {item.data?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name}</Text>
            <Text>From: {item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from}</Text>
            <Text>ID: {item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id}</Text>
            <Text>Timestamp: {dayjs(item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.timestamp).format("YYYY-MM-DD HH:mm:ss")}</Text>
            <Text>Type: {item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type}</Text>
            <Text>Body: {item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body}</Text>
            {JSON.stringify((item.data as any)?.answer)}
          </Stack>
        </Card>
      ))}
      <Pagination
        value={page}
        total={data?.data?.count || 1}
        onChange={setPage}
        withEdges
      />
    </Stack>
  );
}
