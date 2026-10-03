"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi, when, type Rung, type Sign } from "@/ui/api";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Gate, Grade, Ladder, Page, Skeleton } from "@/ui/kit";

type Card = { id: string; signs: Sign[]; rung: Rung; grade: string | null; reported_on: string; verified: boolean; area: string; all_clear: boolean };

export default function ShareCard() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<Card>(`/share/${id}`);
  const { t, sign, lang } = useI18n();
  return (
    <Page title={t("share.title")} eyebrow={t("share.eyebrow")}>
      <Gate q={q} skeleton={<Skeleton n={2} h={160} />}>
        {(c) => (
          <div className="stack-l">
            <div className="card stack-l" style={{ padding: 24 }}>
              <div className="hstack" style={{ gap: 16 }}>
                <Grade g={c.grade} size="md" />
                <div className="stack" style={{ gap: 4 }}>
                  <h2 className="t-title2">{c.all_clear ? t("share.allClear", { area: c.area })
                    : t("share.near", { signs: c.signs.map((s) => sign(s.code, s.chip)).join(", "), area: c.area })}</h2>
                  <p className="secondary">{t("share.reported", { date: when(c.reported_on, { dateStyle: "long" }, localeOf(lang)) })}</p>
                </div>
              </div>
              <Ladder rung={c.rung} />
              <p className="t-title3">{c.verified ? t("share.verified") : t("share.checking")}</p>
            </div>
            <p className="secondary t-foot"><I.Info width={14} height={14} style={{ display: "inline", verticalAlign: "-2px" }} /> {t("share.privacy")}</p>
            <div className="btn-row">
              <Link className="btn btn-prominent" href="/report"><I.Camera /> {t("nav.long.report")}</Link>
              <Link className="btn" href="/">{t("share.what")}</Link>
            </div>
          </div>
        )}
      </Gate>
    </Page>
  );
}
