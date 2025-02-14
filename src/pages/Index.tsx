
import { useState } from "react";
import { UserRegistration } from "@/components/UserRegistration";
import { ChatRoom } from "@/components/ChatRoom";

const Index = () => {
  const [username, setUsername] = useState<string | null>(null);

  const handleRegister = (name: string) => {
    setUsername(name);
  };

  const handleLeave = () => {
    setUsername(null);
  };

  return username ? (
    <ChatRoom currentUser={username} onLeave={handleLeave} />
  ) : (
    <UserRegistration onRegister={handleRegister} />
  );
};

export default Index;
