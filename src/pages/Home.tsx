import clientRoutes from "@/clientRoutes";
import { Button, Container } from "@mantine/core";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <Container>
      <h1>Home</h1>
      <Button onClick={() => navigate(clientRoutes["/sq/dashboard"])}>
        Go to SQ
      </Button>
    </Container>
  );
}
