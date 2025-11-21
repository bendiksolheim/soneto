import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: "Sone To",
  description: "Planlegg løpeturer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full h-full font-display" data-theme="silk">
      <body className={"w-full h-full"}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
