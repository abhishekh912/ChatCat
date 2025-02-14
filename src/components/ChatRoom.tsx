
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { UsersList } from "./UsersList";
import { Send } from "lucide-react";

interface User {
  id: string;
  name: string;
  online: boolean;
}

interface Message {
  id: string;
  text: string;
  username: string;
  timestamp: Date;
  reactions: {
    type: "like" | "heart";
    count: number;
  }[];
}

interface ChatRoomProps {
  currentUser: string;
  onLeave: () => void;
}

export function ChatRoom({ currentUser, onLeave }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users] = useState<User[]>([
    { id: "1", name: currentUser, online: true },
    { id: "2", name: "Alice", online: true },
    { id: "3", name: "Bob", online: false },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      username: currentUser,
      timestamp: new Date(),
      reactions: [],
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  const handleReact = (messageId: string, type: "like" | "heart") => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const existingReaction = msg.reactions.find((r) => r.type === type);
          if (existingReaction) {
            return {
              ...msg,
              reactions: msg.reactions.map((r) =>
                r.type === type ? { ...r, count: r.count + 1 } : r
              ),
            };
          }
          return {
            ...msg,
            reactions: [...msg.reactions, { type, count: 1 }],
          };
        }
        return msg;
      })
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border p-4 hidden md:block">
        <UsersList users={users} currentUser={currentUser} onLeave={onLeave} />
      </aside>
      <main className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={message.username === currentUser}
                onReact={handleReact}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSend}
          className="border-t border-border p-4 flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </main>
    </div>
  );
}
