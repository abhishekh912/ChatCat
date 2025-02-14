
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
}

export function UsersList({ users, currentUser, onLeave }: UsersListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <Button variant="ghost" size="sm" onClick={onLeave}>
          Leave
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="relative">
                <User className="w-8 h-8 text-muted-foreground" />
                {user.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-background" />
                )}
              </div>
              <span className="text-sm flex-1">
                {user.name} {user.name === currentUser && "(You)"}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
