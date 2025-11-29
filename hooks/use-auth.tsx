"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = React.PropsWithChildren<{
  user: User | null;
}>;

export function AuthProvider(props: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(props.user);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(!props.user);

  useEffect(() => {
    const supabase = createClient();

    // If we don't have an initial user from the server, fetch it
    if (!props.user) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
        setIsLoading(false);
      });
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [props.user]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
