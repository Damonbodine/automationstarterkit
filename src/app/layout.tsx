import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/auth/Providers";
import QueryProvider from "@/components/providers/QueryProvider";
import Navigation from "@/components/layout/Navigation";
import { bootWorkersInProcess } from "@/lib/queue/boot";
import ToastProvider from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "EmailAI - Email Summarizer",
  description: "AI-powered email classification and summarization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Boot local workers in-process if enabled
  bootWorkersInProcess();
  return (
    <html lang="en">
      <body className={`bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans`}>
        <Providers>
          <QueryProvider>
            <ToastProvider>
              <Navigation />
              {children}
            </ToastProvider>
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
