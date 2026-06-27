import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fanfic — AI co-writing studio",
  description:
    "Create a story, draft chapters with Claude co-writing, export to Markdown.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
