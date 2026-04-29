import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promata — your spreadsheet, as a website",
  description: "Drop a Google Sheet of finds. Get a sharable link-in-bio page in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
