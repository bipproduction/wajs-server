import { Navigate, Outlet } from "react-router-dom";
import useSWR from "swr";
import apiFetch from "@/lib/apiFetch";
import { Badge, Button, Chip, Group, Pill, Stack } from "@mantine/core";
import { useState } from "react";
import clientRoutes from "@/clientRoutes";

export default function WajsLayout() {
  const [loading, setLoading] = useState(false);
  const { data } = useSWR("/wa/qr", apiFetch.api.wa.state.get, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshInterval: 3000,
    onSuccess(data, key, config) {
      console.log(data.data?.state);
    },
  });

  if (!data?.data?.state) return <Outlet />;
  if (data.data?.state.qr)
    return <Navigate to={clientRoutes["/wajs/qrcode"]} replace />;
  return (
    <Stack>
      <Group>
        <Button
          loading={loading && !data.data?.state.ready}
          disabled={data.data?.state.ready}
          onClick={() => {
            setLoading(true);
            apiFetch.api.wa.start.post();
          }}
        >
          {data.data?.state.ready ? "Ready" : "Start"}
        </Button>
        <Button
          onClick={() => {
            setLoading(true);
            apiFetch.api.wa.restart.post();
          }}
        >
          Reconnect
        </Button>
      </Group>
      <Outlet />
    </Stack>
  );
}
