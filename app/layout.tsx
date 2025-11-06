import type { Metadata } from "next";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
        <AuthProvider>
          <TooltipProvider>
            <Sonner />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
