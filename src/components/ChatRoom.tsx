import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { UsersList } from "./UsersList";
import { Send, Menu, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

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
  text: string;
  timestamp: Date;
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

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
            text: msg.content,
            timestamp: new Date(msg.created_at),
            reactions: [],
          }))
        );
      }
    };

    fetchMessages();
  }, [toast]);

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
          const newMsg = payload.new as any;
          const newMessage: Message = {
            ...newMsg,
            text: newMsg.content,
            timestamp: new Date(newMsg.created_at),
            reactions: [],
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          await channel.track({ username: currentUser } as any);
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
      reply_to: replyingTo?.id,
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
    setReplyingTo(null);
  };

  const handleReact = async (messageId: string, type: "like" | "heart") => {
    const { error } = await supabase.from("reactions").insert({
      message_id: messageId,
      user_id: userId,
      type,
    });

    if (error && error.code === '23505') {
      const { error: deleteError } = await supabase
        .from("reactions")
        .delete()
        .match({ message_id: messageId, user_id: userId, type });

      if (deleteError) {
        toast({
          title: "Error removing reaction",
          description: deleteError.message,
          variant: "destructive",
        });
      }
    } else if (error) {
      toast({
        title: "Error adding reaction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReply = (messageId: string) => {
    const messageToReply = messages.find(m => m.id === messageId);
    if (messageToReply) {
      setReplyingTo(messageToReply);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-6 w-6" />
          ) : (
            <Moon className="h-6 w-6" />
          )}
        </Button>
      </div>

      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out ${
                showSidebar ? "translate-x-0" : "-translate-x-full"
              }`
            : "w-64 border-r border-border"
        } bg-background p-4`}
      >
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
                onReply={handleReply}
                replyingTo={message.reply_to ? messages.find(m => m.id === message.reply_to) : undefined}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSend}
          className="border-t border-border p-4 flex flex-col gap-2"
        >
          {replyingTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Replying to {replyingTo.username}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Type a message..."}
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </main>

      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}
