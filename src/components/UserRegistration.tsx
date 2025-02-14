
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserRegistrationProps {
  onRegister: (username: string, userId: string) => void;
}

export function UserRegistration({ onRegister }: UserRegistrationProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      toast({
        title: "Invalid username",
        description: "Username must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First try to sign in
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && error.status === 400) {
        // If user doesn't exist, sign up
        const signUpResult = await supabase.auth.signUp({
          email,
          password,
        });
        data = signUpResult.data;
        error = signUpResult.error;
      }

      if (error) throw error;

      if (data.user) {
        onRegister(username.trim(), data.user.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Chat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in or create an account to join the conversation
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="text-lg"
            autoFocus
          />
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-lg"
          />
          <Input
            type="password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-lg"
          />
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
