import { useState, useCallback } from "react";
import {
  Container,
  Stack,
  Card,
  Group,
  Button,
  Table,
  TextInput,
  PasswordInput,
  ActionIcon,
  Checkbox,
  Text,
  Title,
  Flex,
  Loader,
} from "@mantine/core";
import { IconReload, IconCheck, IconCopy } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useShallowEffect } from "@mantine/hooks";
import apiFetch from "@/lib/apiFetch";

export default function FlowWaHook() {
  return (
    <Container size="xl" px="md">
      <Stack gap="xl">
        <FlowWaHookForm />
        <FlowWaHookList />
      </Stack>
    </Container>
  );
}

function FlowWaHookList() {
  const [flows, setFlows] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultFlow, setDefaultFlow] = useState("");

  const loadFlows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiFetch.api.chatflows.find.get();
    if (error) {
      showNotification({ title: "Error", message: "Failed to load flows", color: "red" });
    } else {
      setFlows(data?.flows || []);
      setDefaultFlow(data?.defaultFlow || "");
    }
    setLoading(false);
  }, []);

  useShallowEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const syncFlows = async () => {
    setLoading(true);
    const { error } = await apiFetch.api.chatflows.sync.get();
    if (error) {
      showNotification({ title: "Error", message: "Sync failed", color: "red" });
    } else {
      await loadFlows();
      showNotification({ title: "Success", message: "Flows synchronized", color: "green" });
    }
    setLoading(false);
  };

  const setAsDefault = async (id: string) => {
    setLoading(true);
    const { error } = await apiFetch.api.chatflows.default.put({ id, defaultData: {} });
    if (error) {
      showNotification({ title: "Error", message: "Failed to set default flow", color: "red" });
    } else {
      await loadFlows();
      showNotification({ title: "Success", message: "Default flow updated", color: "green" });
    }
    setLoading(false);
  };

  return (
    <Card radius="md" p="lg" withBorder>
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={3}>Flow Management</Title>
          <Button leftSection={<IconReload size={16} />} onClick={syncFlows} loading={loading}>
            Sync Flows
          </Button>
        </Flex>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Default</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {flows.map((flow) => (
              <Table.Tr key={flow.id} bg={defaultFlow === flow.id ? "dark.4" : undefined}>
                <Table.Td>{flow.name}</Table.Td>
                <Table.Td>{flow.type}</Table.Td>
                <Table.Td>
                  <Checkbox checked={defaultFlow === flow.id} onChange={() => setAsDefault(flow.id)} />
                </Table.Td>
              </Table.Tr>
            ))}
            {!loading && flows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text ta="center" c="dimmed">
                    No flows available
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {loading && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Flex justify="center" align="center" py="md">
                    <Loader size="sm" />
                  </Flex>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

function FlowWaHookForm() {
  const [flowUrl, setFlowUrl] = useState("");
  const [flowToken, setFlowToken] = useState("");
  const [loading, setLoading] = useState(false);

  useShallowEffect(() => {
    const loadCredentials = async () => {
      const { data, error } = await apiFetch.api.chatflows["url-token"].get();
      if (error) {
        showNotification({ title: "Error", message: "Failed to load credentials", color: "red" });
      } else {
        setFlowUrl(data?.data?.flowUrl || "");
        setFlowToken(data?.data?.flowToken || "");
      }
    };
    loadCredentials();
  }, []);

  const saveCredentials = async () => {
    if (!flowUrl || !flowToken) {
      showNotification({ title: "Error", message: "URL and token are required", color: "red" });
      return;
    }
    setLoading(true);
    const { error } = await apiFetch.api.chatflows["url-token"].put({ flowUrl, flowToken });
    if (error) {
      showNotification({ title: "Error", message: "Failed to update credentials", color: "red" });
    } else {
      showNotification({ title: "Success", message: "Credentials updated", color: "green" });
    }
    setLoading(false);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(flowToken);
    showNotification({ title: "Copied", message: "Token copied to clipboard", color: "green" });
  };

  return (
    <Card radius="md" p="lg" withBorder>
      <Stack gap="lg">
        <Title order={3}>Flow Credentials</Title>
        <Stack gap="md">
          <TextInput label="Flow URL" placeholder="Enter flow URL" value={flowUrl} onChange={(e) => setFlowUrl(e.currentTarget.value)} />
          <PasswordInput
            label="Flow Token"
            placeholder="Enter flow token"
            value={flowToken}
            onChange={(e) => setFlowToken(e.currentTarget.value)}
            rightSection={
              <ActionIcon onClick={copyToken}>
                <IconCopy size={16} />
              </ActionIcon>
            }
          />
        </Stack>
        <Group justify="flex-end">
          <Button leftSection={<IconCheck size={16} />} onClick={saveCredentials} loading={loading}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
