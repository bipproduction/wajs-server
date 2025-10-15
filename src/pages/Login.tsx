import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import apiFetch from "../lib/apiFetch";
import clientRoutes from "@/clientRoutes";
import { Navigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        // backend otomatis baca cookie JWT dari request
        const res = await apiFetch.api.user.find.get();
        setIsAuthenticated(res.status === 200);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.auth.login.post({
        email,
        password,
      });

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        window.location.href = clientRoutes["/sq/dashboard"];
        return;
      }

      if (response.error) {
        alert(JSON.stringify(response.error));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) return null; // or loading spinner
  if (isAuthenticated)
    return <Navigate to={clientRoutes["/sq/dashboard"]} replace />;

  return (
    <Container>
      <Stack>
        <Text>Login</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Group justify="right">
          <Button onClick={handleSubmit} disabled={loading}>
            Login
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
