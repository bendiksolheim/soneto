import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.provider === "github" && profile?.id != null) {
        token.githubId = String(profile.id);
      }
      return token;
    },
    session({ session, token }) {
      if (!token.githubId) {
        throw new Error("JWT token missing githubId — sign out and back in");
      }
      session.user.id = token.githubId;
      return session;
    },
  },
});
