"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { homeOf, Page, useApp } from "@/ui/kit";

/** "Try": choose citizen or organisation, then sign in or create an account. Signed-in people go to their dashboard. */
export default function StartPage() {
  const { t } = useI18n();
  const { session, mode } = useApp();
  const router = useRouter();
  useEffect(() => { if (session && mode !== "guest") router.replace(homeOf(mode)); }, [session, mode, router]);
  return (
    <Page title={t("start.title")} eyebrow="StreamProof" subtitle={t("start.sub")}>
      <div className="start-grid">
        <section className="card start-card" aria-labelledby="start-citizen">
          <span className="grade grade-md start-ic" aria-hidden><I.Camera /></span>
          <h2 id="start-citizen" className="t-title2">{t("start.citizen")}</h2>
          <p className="secondary">{t("start.citizenText")}</p>
          <div className="start-actions">
            <Link className="btn btn-prominent btn-large btn-block" href="/sign-in?next=/home">{t("signin")}</Link>
            <Link className="btn btn-large btn-block" href="/sign-up?next=/home">{t("signup")}</Link>
            <Link className="btn btn-plain btn-block" href="/sign-in?next=/home#anon">{t("start.anon")}</Link>
          </div>
        </section>
        <section className="card start-card" aria-labelledby="start-org">
          <span className="grade grade-md start-ic" aria-hidden><I.Building /></span>
          <h2 id="start-org" className="t-title2">{t("start.org")}</h2>
          <p className="secondary">{t("start.orgText")}</p>
          <div className="start-actions">
            <Link className="btn btn-prominent btn-large btn-block" href="/sign-in?role=org&next=/dashboard">{t("signin")}</Link>
            <Link className="btn btn-large btn-block" href="/sign-up?role=org&next=/dashboard">{t("signup")}</Link>
          </div>
        </section>
      </div>
    </Page>
  );
}
