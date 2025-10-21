import clientRoutes from "@/clientRoutes";
import { Button, Container, Group, Stack } from "@mantine/core";
import { Outlet, useNavigate } from "react-router-dom";

export default function WaHookLayout() {
  const navigate = useNavigate();
  return (
    <Container size="xl" w={"100%"}>
      <Group justify="flex-start" p={"md"}>
          <Button
            size="compact-xs"
            radius={"lg"}
            onClick={() =>
              navigate(clientRoutes["/sq/dashboard/wa-hook/flow-wa-hook"])
            }
          >
            Flow WA Hook
          </Button>
        </Group>
        <Outlet />
    </Container>
  );
}
