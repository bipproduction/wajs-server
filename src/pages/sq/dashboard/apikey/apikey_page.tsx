import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  ScrollArea,
  Divider,
  Tooltip,
  Badge,
  Loader,
  ActionIcon,
  Center,
} from "@mantine/core";
import { IconKey, IconPlus, IconTrash, IconCopy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { showNotification } from "@mantine/notifications";
import apiFetch from "@/lib/apiFetch";

export default function ApiKeyPage() {
  return (
    <Container
      w={"100%"}
      size="lg"
      px="md"
      py="xl"
      style={{
        background:
          "radial-gradient(800px 400px at 10% 10%, rgba(0,255,200,0.05), transparent), radial-gradient(800px 400px at 90% 90%, rgba(0,255,255,0.04), transparent), linear-gradient(180deg, #0f0f0f 0%, #191919 100%)",
        borderRadius: "20px",
        boxShadow: "0 0 60px rgba(0,255,200,0.04)",
        color: "#EAEAEA",
        minHeight: "90vh",
      }}
    >
      <Stack gap="xl">
        <Group justify="space-between">
          <Group gap="xs">
            <IconKey size={28} color="#00FFC8" />
            <Text fw={700} fz={26} c="#EAEAEA">
              API Key Management
            </Text>
          </Group>
          <Badge
            size="lg"
            radius="lg"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,255,200,0.08), rgba(0,255,255,0.05))",
              border: "1px solid rgba(0,255,220,0.2)",
              color: "#00FFC8",
            }}
          >
            Secure Access
          </Badge>
        </Group>
        <Divider color="rgba(0,255,200,0.1)" />
        <CreateApiKey />
      </Stack>
    </Container>
  );
}

function CreateApiKey() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification({
        title: "Missing name",
        message: "Please enter a name for your API key",
        color: "red",
      });
      return;
    }
    setLoading(true);
    const res = await apiFetch.api.apikey.create.post({
      name,
      description,
      expiredAt,
    });
    setLoading(false);
    if (res.status === 200) {
      setName("");
      setDescription("");
      setExpiredAt("");
      showNotification({
        title: "Success",
        message: "API key created successfully",
        color: "teal",
      });
      setRefresh((r) => !r);
    }
  };

  return (
    <Stack gap="xl">
      <Card
        p="xl"
        radius="lg"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          border: "1px solid rgba(0,255,200,0.1)",
          boxShadow: "0 0 30px rgba(0,255,200,0.05)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600} fz="lg" c="#EAEAEA">
              Create New API Key
            </Text>
            <IconPlus size={22} color="#00FFC8" />
          </Group>
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Key Name"
                placeholder="Enter key name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextInput
                label="Description"
                placeholder="Describe the key purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextInput
                label="Expiration Date"
                placeholder="YYYY-MM-DD"
                type="date"
                value={expiredAt}
                onChange={(e) => setExpiredAt(e.target.value)}
              />
              <Group justify="right" mt="md">
                <Button
                  variant="outline"
                  color="gray"
                  onClick={() => {
                    setName("");
                    setDescription("");
                    setExpiredAt("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  style={{
                    background:
                      "linear-gradient(90deg, #00FFC8 0%, #00FFFF 100%)",
                    color: "#191919",
                    fontWeight: 600,
                  }}
                >
                  Save Key
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Card>

      <ListApiKey refresh={refresh} />
    </Stack>
  );
}

function ListApiKey({ refresh }: { refresh: boolean }) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApiKeys = async () => {
      setLoading(true);
      const res = await apiFetch.api.apikey.list.get();
      if (res.status === 200) {
        setApiKeys(res.data?.apiKeys || []);
      }
      setLoading(false);
    };
    fetchApiKeys();
  }, [refresh]);

  return (
    <Card
      p="xl"
      radius="lg"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        border: "1px solid rgba(0,255,200,0.1)",
        boxShadow: "0 0 30px rgba(0,255,200,0.05)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} fz="lg" c="#EAEAEA">
            Active API Keys
          </Text>
        </Group>
        <Divider color="rgba(0,255,200,0.05)" />
        {loading ? (
          <Center py="xl">
            <Loader color="teal" />
          </Center>
        ) : apiKeys.length === 0 ? (
          <Center py="xl">
            <Text c="#9A9A9A">No API keys found</Text>
          </Center>
        ) : (
          <ScrollArea>
            <Table
              highlightOnHover
              verticalSpacing="sm"
              horizontalSpacing="md"
              style={{
                color: "#EAEAEA",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Expired</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Updated</Table.Th>
                  <Table.Th align="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {apiKeys.map((apiKey: any, index: number) => (
                  <Table.Tr
                    key={index}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 10,
                      transition: "background 0.15s ease",
                    }}
                  >
                    <Table.Td>{apiKey.name}</Table.Td>
                    <Table.Td c="#9A9A9A">{apiKey.description || "—"}</Table.Td>
                    <Table.Td>
                      {apiKey.expiredAt
                        ? new Date(apiKey.expiredAt).toISOString().split("T")[0]
                        : "—"}
                    </Table.Td>
                    <Table.Td>
                      {new Date(apiKey.createdAt).toISOString().split("T")[0]}
                    </Table.Td>
                    <Table.Td>
                      {new Date(apiKey.updatedAt).toISOString().split("T")[0]}
                    </Table.Td>
                    <Table.Td align="right">
                      <Group gap={4} justify="right">
                        <Tooltip label="Copy Key" withArrow>
                          <ActionIcon
                            variant="light"
                            color="teal"
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey.key);
                              showNotification({
                                title: "Copied",
                                message: "API key copied to clipboard",
                                color: "teal",
                              });
                            }}
                          >
                            <IconCopy size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete Key" withArrow>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={async () => {
                              await apiFetch.api.apikey.delete.delete({
                                id: apiKey.id,
                              });
                              setApiKeys((prev) =>
                                prev.filter((a) => a.id !== apiKey.id),
                              );
                              showNotification({
                                title: "Deleted",
                                message: "API key removed successfully",
                                color: "red",
                              });
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Card>
  );
}
