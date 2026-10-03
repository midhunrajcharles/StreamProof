"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useApi, when, type Mission } from "@/ui/api";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Gate, Page, Section, Skeleton } from "@/ui/kit";
import { Map, useMeta } from "@/ui/Map";

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<Mission>(`/missions/${id}`);
  const meta = useMeta();
  const { t, tr, sign, lang } = useI18n();
  const streams = useMemo(() => meta?.streams.map((s) => s.line) ?? [], [meta]);

  return (
    <Page title={t("missionp.title", { id })} eyebrow={t("missionp.eyebrow")} back={{ href: "/reports", label: t("nav.long.reports") }}>
      <Gate q={q} skeleton={<Skeleton n={3} h={120} />}>
        {(m) => {
          const markers = [{ id: m.id, lat: m.position.lat, lon: m.position.lon, title: t("missionp.title", { id: m.id }), label: "" }];
          const circles = [{ lat: m.position.lat, lon: m.position.lon, radius: m.radius_m }];
          return (
            <>
              <div className="card section stack">
                <p className="eyebrow">({m.signs.map((s) => sign(s.code, s.chip)).join(", ")})</p>
                <p className="t-title3">{tr(m.request)}</p>
                <p className="secondary t-sub">{t("missionp.meta", { place: tr(m.place), date: when(m.created_at, { day: "numeric", month: "short" }, localeOf(lang)), n: m.submissions })}</p>
              </div>
              <Section title={t("missionp.where")} n={1} foot={t("missionp.whereFoot", { m: m.radius_m })}>
                <Map center={[m.position.lat, m.position.lon]} streams={streams} markers={markers} circles={circles} label={t("missionp.where")} />
              </Section>
              <div className="section"><Callout kind="warn" title={t("card.safe")}>{tr(m.safety)}</Callout></div>
              <div className="sticky-action">
                {m.status === "open" ? (
                  <Link className="btn btn-prominent btn-large btn-block" href={`/report?mission=${m.id}`}><I.Camera /> {t("missionp.cta")}</Link>
                ) : <p className="secondary">{t("missionp.closed")}</p>}
              </div>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
