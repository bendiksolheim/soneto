import type { Metadata, Viewport } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { GestureLock } from "@/components/gesture-lock";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: "SoneTo",
  description: "Planlegg løpeturer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <GestureLock />
        <AuthProvider user={session?.user ?? null}>{children}</AuthProvider>
      </body>
    </html>
  );
}
