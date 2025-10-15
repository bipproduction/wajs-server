import apiFetch from "@/lib/apiFetch";
import { ReactQRCode } from "@lglab/react-qr-code";
import { Card, Container, Group } from "@mantine/core";
import useSWR from "swr";
export default function QrcodePage() {
  const { data } = useSWR("/wa/qr", apiFetch.api.wa.qr.get, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshInterval: 3000,
  });
  return (
    <Container size={"sm"}>
      <h1>QrCode</h1>
      <Group>
        <Card bg={"white"}>
          <ReactQRCode size={256} value={data?.data?.qr || ""} />
        </Card>
      </Group>
    </Container>
  );
}
