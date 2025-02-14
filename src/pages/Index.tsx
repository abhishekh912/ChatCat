
import { useState, useEffect } from "react";
import { UserRegistration } from "@/components/UserRegistration";
import { ChatRoom } from "@/components/ChatRoom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegisteredUser {
  username: string;
  userId: string;
}

const Index = () => {
  const [user, setUser] = useState<RegisteredUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Here we're using the email as username for existing sessions
        // In a production app, you might want to store/retrieve the username differently
        setUser({
          username: session.user.email || 'Anonymous',
          userId: session.user.id
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          username: session.user.email || 'Anonymous',
          userId: session.user.id
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRegister = (username: string, userId: string) => {
    setUser({ username, userId });
  };

  const handleLeave = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return user ? (
    <ChatRoom currentUser={user.username} userId={user.userId} onLeave={handleLeave} />
  ) : (
    <UserRegistration onRegister={handleRegister} />
  );
};

export default Index;
