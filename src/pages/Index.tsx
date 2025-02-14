
import { useState } from "react";
import { UserRegistration } from "@/components/UserRegistration";
import { ChatRoom } from "@/components/ChatRoom";

interface RegisteredUser {
  username: string;
  userId: string;
}

const Index = () => {
  const [user, setUser] = useState<RegisteredUser | null>(null);

  const handleRegister = (username: string, userId: string) => {
    setUser({ username, userId });
  };

  const handleLeave = () => {
    setUser(null);
  };

  return user ? (
    <ChatRoom currentUser={user.username} userId={user.userId} onLeave={handleLeave} />
  ) : (
    <UserRegistration onRegister={handleRegister} />
  );
};

export default Index;
