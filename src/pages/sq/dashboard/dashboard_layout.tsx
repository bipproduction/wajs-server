import { useEffect, useState } from "react";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  Badge,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconKey,
  IconWebhook,
  IconBrandWhatsapp,
  IconUser,
  IconLogout,
} from "@tabler/icons-react";
import type { User } from "generated/prisma";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import apiFetch from "@/lib/apiFetch";
import clientRoutes from "@/clientRoutes";

function Logout() {
  return (
    <Group justify="center" mt="md">
      <Button
        variant="light"
        color="red"
        radius="xl"
        size="compact-sm"
        leftSection={<IconLogout size={16} />}
        onClick={async () => {
          await apiFetch.auth.logout.delete();
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
      >
        Logout
      </Button>
    </Group>
  );
}

export default function DashboardLayout() {
  const [opened, setOpened] = useLocalStorage({
    key: "nav_open",
    defaultValue: true,
  });

  return (
    <AppShell
      padding="lg"
      navbar={{
        width: 270,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      styles={{
        main: {
          background: "#191919",
          color: "#EAEAEA",
        },
      }}
    >
      <AppShell.Navbar
        p="md"
        style={{
          background: "rgba(30,30,30,0.8)",
          backdropFilter: "blur(10px)",
          borderRight: "1px solid rgba(0,255,200,0.15)",
          // boxShadow: "0 0 18px rgba(0,255,200,0.1)",
        }}
      >
        <AppShell.Section>
          <Group justify="flex-end" p="xs">
            <Tooltip
              label={opened ? "Collapse navigation" : "Expand navigation"}
              withArrow
              color="cyan"
            >
              <ActionIcon
                variant="light"
                radius="xl"
                onClick={() => setOpened((v) => !v)}
                aria-label="Toggle navigation"
                style={{
                  color: "#00FFC8",
                  background: "rgba(0,255,200,0.1)",
                  // boxShadow: "0 0 10px rgba(0,255,200,0.2)",
                }}
              >
                {opened ? <IconChevronLeft /> : <IconChevronRight />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          <NavigationDashboard />
        </AppShell.Section>

        <AppShell.Section>
          <HostView />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="md">
          <Paper
            withBorder
            shadow="lg"
            radius="xl"
            p="md"
            style={{
              background: "rgba(45,45,45,0.6)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,255,200,0.2)",
            }}
          >
            <Flex align="center" gap="md">
              {!opened && (
                <Tooltip label="Open navigation menu" withArrow color="cyan">
                  <ActionIcon
                    variant="light"
                    radius="xl"
                    onClick={() => setOpened(true)}
                    aria-label="Open navigation"
                    style={{
                      color: "#00FFFF",
                      background: "rgba(0,255,200,0.1)",
                    }}
                  >
                    <IconChevronRight />
                  </ActionIcon>
                </Tooltip>
              )}
              <Title order={3} fw={600} c="#EAEAEA">
                Control Center
              </Title>
              <Badge
                variant="light"
                color="teal"
                size="sm"
                style={{
                  background: "rgba(0,255,200,0.15)",
                  color: "#00FFFF",
                }}
              >
                Live
              </Badge>
            </Flex>
          </Paper>
          <Outlet />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

function HostView() {
  const [host, setHost] = useState<User | null>(null);

  useEffect(() => {
    async function fetchHost() {
      const { data } = await apiFetch.api.user.find.get();
      setHost(data?.user ?? null);
    }
    fetchHost();
  }, []);

  return (
    <Card
      radius="xl"
      withBorder
      shadow="md"
      p="md"
      style={{
        background: "rgba(45,45,45,0.6)",
        border: "1px solid rgba(0,255,200,0.15)",
        // boxShadow: "0 0 12px rgba(0,255,200,0.1)",
      }}
    >
      {host ? (
        <Stack gap="sm">
          <Flex gap="md" align="center">
            <Avatar
              size="lg"
              radius="xl"
              style={{
                background:
                  "linear-gradient(145deg, rgba(0,255,200,0.3), rgba(0,255,255,0.4))",
                color: "#EAEAEA",
                fontWeight: 700,
              }}
            >
              {host.name?.[0]}
            </Avatar>
            <Stack gap={2}>
              <Text fw={600} c="#EAEAEA">
                {host.name}
              </Text>
              <Text size="sm" c="#9A9A9A">
                {host.email}
              </Text>
            </Stack>
          </Flex>
          <Divider color="rgba(0,255,200,0.2)" />
          <Logout />
        </Stack>
      ) : (
        <Text size="sm" c="#9A9A9A" ta="center">
          Host data unavailable
        </Text>
      )}
    </Card>
  );
}

function NavigationDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      path: "/sq/dashboard/dashboard",
      label: "Overview",
      icon: <IconDashboard size={20} color="#00FFFF" />,
      desc: "Main dashboard insights",
    },
    {
      path: "/sq/dashboard/apikey/apikey",
      label: "API Keys",
      icon: <IconKey size={20} color="#00FFFF" />,
      desc: "Manage and regenerate access tokens",
    },
    {
      path: "/sq/dashboard/wajs/wajs-home",
      label: "Wajs Integration",
      icon: <IconBrandWhatsapp size={20} color="#00FFFF" />,
      desc: "WhatsApp session manager",
    },
    {
      path: "/sq/dashboard/webhook/webhook-home",
      label: "Webhooks",
      icon: <IconWebhook size={20} color="#00FFFF" />,
      desc: "Incoming and outgoing event handlers",
    },
  ];

  return (
    <Stack gap="xs">
      {items.map((item) => (
        <NavLink
          key={item.path}
          active={location.pathname.startsWith(item.path)}
          leftSection={item.icon}
          label={item.label}
          description={item.desc}
          onClick={() =>
            navigate(clientRoutes[item.path as keyof typeof clientRoutes])
          }
          style={{
            borderRadius: "12px",
            color: "#EAEAEA",
            background: location.pathname.startsWith(item.path)
              ? "rgba(0,255,200,0.15)"
              : "transparent",
            transition: "background 0.2s ease",
          }}
          styles={{
            label: { fontWeight: 500, color: "#EAEAEA" },
            description: { color: "#9A9A9A" },
          }}
        />
      ))}
    </Stack>
  );
}
