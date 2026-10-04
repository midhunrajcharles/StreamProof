import type { Metadata, Viewport } from "next";
import Shell from "@/ui/Shell";
import { fontVars } from "@/ui/fonts";
import "./app.css";

// Root layout for the web app (report, review, brief, standards, verify).

export const metadata: Metadata = {
  title: { default: "StreamProof", template: "%s · StreamProof" },
  description: "Report a stream, see how trustworthy the evidence is, and review it: StreamProof for OneAquaHealth.",
  applicationName: "StreamProof",
  appleWebApp: { capable: true, title: "StreamProof", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw under notches and rounded corners; the CSS respects safe areas
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={fontVars}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
