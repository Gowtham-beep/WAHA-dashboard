import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAHA Dashboard",
  description: "WhatsApp Automation & Messaging Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
