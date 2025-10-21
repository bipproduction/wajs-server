import apiFetch from "@/lib/apiFetch";
import { Skeleton, Stack, Text, Title } from "@mantine/core";
import { useShallowEffect } from "@mantine/hooks";
import useSWR from "swr";

export default function WaHookHome() {
  const { data, error, isLoading, mutate } = useSWR("/wa-hook", apiFetch["wa-hook"].list.get,{
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
      <pre>{JSON.stringify(data?.data?.list, null, 2)}</pre>
    </Stack>
  );
}
