import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { UsersList } from "./UsersList";
import { Send, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  reply_to?: string;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchMessages = async () => {
    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (selectedUserId) {
      if (isValidUUID(userId) && isValidUUID(selectedUserId)) {
        query = query.in('user_id', [userId, selectedUserId]);
      } else {
        console.error("Invalid UUID format for user IDs");
        toast({
          title: "Error fetching messages",
          description: "Invalid user ID format",
          variant: "destructive",
        });
        return;
      }
    }

    const { data: messagesData, error: messagesError } = await query;

    if (messagesError) {
      console.error("Messages error:", messagesError);
      toast({
        title: "Error fetching messages",
        description: messagesError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: reactionsData, error: reactionsError } = await supabase
      .from("reactions")
      .select("*");

    if (reactionsError) {
      console.error("Reactions error:", reactionsError);
      toast({
        title: "Error fetching reactions",
        description: reactionsError.message,
        variant: "destructive",
      });
      return;
    }

    if (messagesData) {
      const processedMessages = messagesData.map((msg) => {
        const messageReactions = reactionsData?.filter(r => r.message_id === msg.id) || [];
        const reactionCounts = messageReactions.reduce((acc, reaction) => {
          const type = reaction.type as "like" | "heart";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<"like" | "heart", number>);

        return {
          ...msg,
          text: msg.content,
          timestamp: new Date(msg.created_at),
          reactions: [
            ...(reactionCounts.like ? [{ type: "like" as const, count: reactionCounts.like }] : []),
            ...(reactionCounts.heart ? [{ type: "heart" as const, count: reactionCounts.heart }] : [])
          ],
        };
      });

      const filteredMessages = selectedUserId
        ? processedMessages.filter(
            msg => msg.user_id === userId || msg.user_id === selectedUserId
          )
        : processedMessages;

      setMessages(filteredMessages);
      setTimeout(scrollToBottom, 100);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedUserId]);

  useEffect(() => {
    const channel = supabase.channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data: messageData, error } = await supabase
              .from("messages")
              .select("*")
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error("Error fetching new message:", error);
              return;
            }

            const newMessage: Message = {
              ...messageData,
              text: messageData.content,
              timestamp: new Date(messageData.created_at),
              reactions: [],
            };

            setMessages((prev) => [...prev, newMessage]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel("public:reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionsChannel);
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
        const onlineUsers = Object.entries(state).map(([id, presenceState]) => ({
          id,
          name: Array.isArray(presenceState) && presenceState[0] 
            ? (presenceState[0] as { username?: string }).username || "Anonymous"
            : "Anonymous",
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

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage.trim(),
      user_id: userId,
      username: currentUser,
      reply_to: replyingTo?.id,
    };

    const { error } = await supabase
      .from("messages")
      .insert([message]);

    if (error) {
      console.error("Send message error:", error);
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
    setReplyingTo(null);
    setTimeout(scrollToBottom, 100);
  };

  const handleReact = async (messageId: string, type: "like" | "heart") => {
    const { data: existingReaction, error: fetchError } = await supabase
      .from("reactions")
      .select("*")
      .match({ message_id: messageId, user_id: userId, type })
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      toast({
        title: "Error checking reaction",
        description: fetchError.message,
        variant: "destructive",
      });
      return;
    }

    if (existingReaction) {
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
    } else {
      const { error: insertError } = await supabase
        .from("reactions")
        .insert({
          message_id: messageId,
          user_id: userId,
          type,
        });

      if (insertError) {
        toast({
          title: "Error adding reaction",
          description: insertError.message,
          variant: "destructive",
        });
      }
    }

    fetchMessages();
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
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out ${
                showSidebar ? "translate-x-0" : "-translate-x-full"
              }`
            : "w-64 border-r border-border"
        } bg-background p-4`}
      >
        <UsersList 
          users={users} 
          currentUser={currentUser} 
          onLeave={onLeave}
          onUserSelect={setSelectedUserId}
          selectedUserId={selectedUserId}
        />
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {selectedUserId 
              ? `Chat with ${users.find(u => u.id === selectedUserId)?.name}`
              : "All Messages"
            }
          </h2>
        </div>
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={message.username === currentUser}
                onReact={handleReact}
                onReply={handleReply}
                replyingTo={messages.find(m => m.id === message.reply_to)}
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
              onKeyPress={handleKeyPress}
              placeholder={
                selectedUserId
                  ? `Message ${users.find(u => u.id === selectedUserId)?.name}...`
                  : replyingTo
                  ? `Reply to ${replyingTo.username}...`
                  : "Type a message..."
              }
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

const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
