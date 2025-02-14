
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { UsersList } from "./UsersList";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  online: boolean;
}

interface Message {
  id: string;
  content: string;
  username: string;
  created_at: string;
  reactions: {
    type: "like" | "heart";
    count: number;
  }[];
}

interface ChatRoomProps {
  currentUser: string;
  userId: string;
  onLeave: () => void;
}

export function ChatRoom({ currentUser, userId, onLeave }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "Error fetching messages",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setMessages(
          data.map((msg) => ({
            ...msg,
            reactions: [],
          }))
        );
      }
    };

    fetchMessages();
  }, [toast]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [
            ...prev,
            { ...newMessage, reactions: [] },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track user presence
  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state).map((id) => ({
          id,
          name: (state[id][0] as { username: string }).username,
          online: true,
        }));
        setUsers(onlineUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            username: currentUser,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage.trim(),
      user_id: userId,
      username: currentUser,
    };

    const { error } = await supabase.from("messages").insert(message);

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
  };

  const handleReact = async (messageId: string, type: "like" | "heart") => {
    const { error } = await supabase.from("reactions").insert({
      message_id: messageId,
      user_id: userId,
      type,
    });

    if (error) {
      toast({
        title: "Error adding reaction",
        description: error.message,
        variant: "destructive",
      });
    }
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
