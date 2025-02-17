
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  name: string;
  online: boolean;
}

interface UsersListProps {
  users: User[];
  currentUser: string;
  onLeave: () => void;
  onUserSelect: (userId: string | null) => void;
  selectedUserId: string | null;
}

export function UsersList({ users, currentUser, onLeave, onUserSelect, selectedUserId }: UsersListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Chat Room</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onLeave}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          Leave
        </Button>
      </div>
      <Button 
        variant={selectedUserId === null ? "secondary" : "ghost"}
        className={`mb-2 ${
          selectedUserId === null 
            ? "bg-white/10 text-white hover:bg-white/20" 
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={() => onUserSelect(null)}
      >
        All Messages
      </Button>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                selectedUserId === user.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => onUserSelect(user.id !== selectedUserId ? user.id : null)}
            >
              <div className="relative">
                <User className="w-8 h-8" />
                {user.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-[#1A1F2C]" />
                )}
              </div>
              <span className="text-sm flex-1 text-left">
                {user.name} {user.name === currentUser && "(You)"}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
