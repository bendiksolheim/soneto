import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "SoneTo",
  description: "Planlegg løpeturer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="w-full h-full font-display" data-theme="silk">
      <body className={"w-full h-full"}>
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
