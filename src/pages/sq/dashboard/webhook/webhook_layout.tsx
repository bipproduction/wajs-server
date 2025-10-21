import {
  Button,
  Group,
  Stack,
  Title,
  Tooltip,
  Divider,
  Container,
  Paper,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate, Outlet } from "react-router-dom";

export default function WebhookLayout() {
  const navigate = useNavigate();

  return <Outlet />;
}
