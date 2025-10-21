import apiFetch from "@/lib/apiFetch";
import { Skeleton, Stack, Text, Title } from "@mantine/core";
import { useShallowEffect } from "@mantine/hooks";
import useSWR from "swr";

export default function WaHookHome() {
  const { data, error, isLoading, mutate } = useSWR("/wa-hook", apiFetch["wa-hook"].list.get, {
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
  }, [])

  if (isLoading) return <Skeleton height={500} />
  if (error) return <div>Error: {error.message}</div>
  return (
    <Stack>
      <Title order={2}>WaHookHome</Title>
      {data?.data?.list.map((item) => (
        <Stack key={item.id}>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.timestamp}</Text>
          <Text key={item.id}>{item.data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type}</Text>
        </Stack>
      ))}
    </Stack>
  );
}
