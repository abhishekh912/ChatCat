
import { useState } from "react";
import { Heart, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  onReact: (messageId: string, type: "like" | "heart") => void;
}

export function ChatMessage({ message, isCurrentUser, onReact }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-start gap-2 animate-slideIn",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex flex-col max-w-[70%] space-y-1",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        <span className="text-xs text-muted-foreground px-2">
          {message.username}
        </span>
        <div
          className={cn(
            "rounded-lg px-4 py-2 shadow-sm",
            isCurrentUser
              ? "bg-chat-userBg text-primary rounded-tr-none"
              : "bg-chat-otherBg text-primary rounded-tl-none"
          )}
        >
          <p className="text-sm">{message.text}</p>
        </div>
        <div className="flex gap-1 h-6">
          {(isHovered || message.reactions.length > 0) && (
            <div className="flex gap-1 px-2 animate-fadeIn">
              <button
                onClick={() => onReact(message.id, "like")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReact(message.id, "heart")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          )}
          {message.reactions.map((reaction) => (
            <span
              key={reaction.type}
              className="text-xs bg-background rounded-full px-2 py-1 shadow-sm"
            >
              {reaction.type === "like" ? "👍" : "❤️"} {reaction.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
