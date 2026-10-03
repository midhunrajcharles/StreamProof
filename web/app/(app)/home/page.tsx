"use client";
import Link from "next/link";
import { ago, useApi, type CitizenProfile, type Mission, type Report } from "@/ui/api";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Empty, Gate, Grade, Page, Row, Section, Skeleton } from "@/ui/kit";
import { Avatar, StarPill, useStarText } from "@/ui/profile";

type Me = { name: string; demo: boolean; reports: Report[]; missions: Mission[]; counts: { reports: number; verified: number; missions: number } };

/** The citizen's dashboard: report, follow your reports, open missions, stars. */
export default function CitizenHome() {
  const { t, tr, sign, rung, lang } = useI18n();
  const loc = localeOf(lang);
  const me = useApi<Me>("/me");
  const profile = useApi<CitizenProfile>(me.data ? "/citizen/profile" : null);
  const { level } = useStarText("citizen");
  const p = profile.data;
  const signs = (r: { signs: { code: string; chip: string }[] }) => r.signs.map((s) => sign(s.code, s.chip)).join(", ");
  return (
    <Page title={me.data ? t("home.hello", { name: me.data.name }) : t("nav.home")} eyebrow={t("group.citizen")}>
      <Gate q={me} skeleton={<Skeleton n={3} h={96} />}>
        {(m) => (
          <>
            <Link href="/report" className="card home-hero">
              <span className="home-hero-ic" aria-hidden><I.Camera /></span>
              <span className="stack" style={{ gap: 4, flex: 1 }}>
                <span className="t-title2">{t("nav.long.report")}</span>
                <span className="secondary">{t("home.reportText")}</span>
              </span>
              <I.ChevronRight className="chev" />
            </Link>

            <div className="stats section" role="list" aria-label={t("nav.long.reports")}>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.reports")}</span><span className="stat-n">{m.counts.reports}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.verified")}</span><span className="stat-n">{m.counts.verified}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("rec.title")}</span><span className="stat-n">{p ? p.recognition.stars : "–"}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.missions")}</span><span className="stat-n">{m.counts.missions}</span></div>
            </div>

            {p ? (
              <Section title={t("rec.title")}>
                <Link href="/account" className="card home-me">
                  <Avatar name={p.display} colour={p.avatar} size={48} />
                  <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <span className="t-headline">{level(p.recognition.level)} <StarPill n={p.recognition.stars} /></span>
                    <span className="secondary t-sub">
                      {p.recognition.next_level ? t("rec.toNext", { n: p.recognition.stars_to_next, level: level(p.recognition.next_level) }) : t("rec.top")}
                      {" · "}{t("rec.badges")} {p.recognition.badges.filter((b) => b.earned).length}/{p.recognition.badges.length}
                    </span>
                  </span>
                  <span className="link-text t-sub">{t("home.starsLink")}</span>
                  <I.ChevronRight className="chev" />
                </Link>
                {!p.has_account && !p.demo ? (
                  <div style={{ marginTop: 12 }}>
                    <Callout title={t("acc.anonTitle")}>
                      <p style={{ margin: "0 0 10px" }}>{t("acc.anonBody")}</p>
                      <Link className="btn btn-sm btn-prominent" href="/sign-up?next=/home">{t("signup")}</Link>
                    </Callout>
                  </div>
                ) : null}
              </Section>
            ) : null}

            {m.missions.length ? (
              <Section title={t("missions.title")} foot={t("missions.foot")}>
                <div className="group">
                  {m.missions.slice(0, 3).map((x) => (
                    <Row key={x.id} href={`/missions/${x.id}`} lead={<I.Flag className="status-ic info" />}
                      title={`${signs(x)} · ${tr(x.place)}`} sub={<span className="clamp-2">{tr(x.request)}</span>} />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title={t("home.recent")} trail={m.reports.length ? <Link className="btn btn-sm" href="/reports">{t("home.seeAll")}</Link> : null}>
              {m.reports.length ? (
                <div className="group">
                  {m.reports.slice(0, 4).map((r) => (
                    <Row key={r.id} href={`/reports/${r.id}`} lead={<Grade g={r.grade} />}
                      title={signs(r)} sub={`${rung(r.rung.value, r.rung.label)} · ${ago(r.created_at, loc)}`} />
                  ))}
                </div>
              ) : (
                <div className="card"><Empty icon={<I.Reports />} title={t("home.none")}
                  action={<Link className="btn btn-prominent" href="/report"><I.Camera /> {t("nav.long.report")}</Link>}>{t("home.noneText")}</Empty></div>
              )}
            </Section>
          </>
        )}
      </Gate>
    </Page>
  );
}
