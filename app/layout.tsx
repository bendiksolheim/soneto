import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: "SoneTo",
  description: "Planlegg løpeturer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="w-full h-full font-display" data-theme="silk">
      <body className={"w-full h-full"}>
        <AuthProvider user={session?.user ?? null}>{children}</AuthProvider>
      </body>
    </html>
  );
}
