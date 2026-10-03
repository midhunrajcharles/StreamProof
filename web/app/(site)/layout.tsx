import type { Metadata } from "next";
import HeadTags from "@/components/HeadTags";
import { getLt, landingLang } from "@/components/lt";

const title = "StreamProof — citizen stream reports that cities can trust";
const description =
  "A trust and provenance add-on to OneAquaHealth's FHIR guide. Citizen stream reports are graded A to D with readable reasons, strengthened by neighbours and experts, and released only for the uses their trust level permits.";

// Title and description follow the visitor's language (the "sp-lang" cookie).
export async function generateMetadata(): Promise<Metadata> {
  const lang = await landingLang();
  const lt = await getLt();
  const t = lang === "en" ? title : `StreamProof — ${lt("Citizen stream reports that cities can trust")}`;
  const d = lang === "en" ? description : lt("StreamProof grades every citizen stream report from A to D with reasons anyone can read, lets neighbours and experts make it stronger, and writes it into OneAquaHealth’s own FHIR standard with a rule for what each trust level may be used for.");
  return {
    title: t,
    description: d,
    robots: { index: true, follow: true },
    authors: [{ name: "StreamProof team" }],
    openGraph: { type: "website", siteName: "StreamProof", title: t, description: d, locale: lang === "en" ? "en_GB" : lang },
    twitter: { card: "summary", title: t, description: d },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }] },
  };
}

// Root layout for the landing page only; the web app has its own in app/(app).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await landingLang();
  return (
    <html lang={lang === "en" ? "en-GB" : lang}>
      <head>
        <HeadTags />
      </head>
      <body>{children}</body>
    </html>
  );
}
