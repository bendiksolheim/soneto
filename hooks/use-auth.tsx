"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { createContext, use } from "react";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function signOut() {
  await nextAuthSignOut();
}

type AuthProviderProps = React.PropsWithChildren<{
  user: AuthUser | null;
}>;

export function AuthProvider(props: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ user: props.user, isLoading: false, signOut }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
