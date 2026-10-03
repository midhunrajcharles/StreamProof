import type { Metadata } from "next";
import HeadTags from "@/components/HeadTags";

const title = "StreamProof — citizen stream reports that cities can trust";
const description =
  "A trust and provenance add-on to OneAquaHealth's FHIR guide. Citizen stream reports are graded A to D with readable reasons, strengthened by neighbours and experts, and released only for the uses their trust level permits.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  authors: [{ name: "StreamProof team" }],
  openGraph: {
    type: "website",
    siteName: "StreamProof",
    title,
    description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
  },
};

// Root layout for the landing page only; the web app has its own in app/(app).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <HeadTags />
      </head>
      <body>{children}</body>
    </html>
  );
}
