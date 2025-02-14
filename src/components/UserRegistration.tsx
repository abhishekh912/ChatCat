
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface UserRegistrationProps {
  onRegister: (username: string) => void;
}

export function UserRegistration({ onRegister }: UserRegistrationProps) {
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      toast({
        title: "Invalid username",
        description: "Username must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }
    onRegister(username.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Chat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your name to join the conversation
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="text-lg"
            autoFocus
          />
          <Button type="submit" className="w-full" size="lg">
            Join Chat
          </Button>
        </form>
      </div>
    </div>
  );
}
