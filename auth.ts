import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (!token.sub) {
        throw new Error("JWT token missing sub");
      }
      session.user.id = token.sub;
      return session;
    },
  },
});
