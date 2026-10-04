"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, useApi, type City, type Mission, type Report } from "@/ui/api";
import { CityPicker } from "@/ui/city";
import { useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Page, Section, SignIn, Skeleton, useApp } from "@/ui/kit";
import { Map, useMeta } from "@/ui/Map";
import { PhotoField } from "@/ui/photo";
import { formOf, saveDraft, type Draft } from "@/ui/outbox";

function distanceKm(a: [number, number], b: [number, number]) {
  const k = Math.PI / 180, x = (b[1] - a[1]) * k * Math.cos(((a[0] + b[0]) / 2) * k), y = (b[0] - a[0]) * k;
  return Math.hypot(x, y) * 6371;
}

type Msg = { key: string; vars?: Record<string, string | number> };

function ReportForm() {
  const router = useRouter();
  const missionId = useSearchParams().get("mission") ?? "";
  const meta = useMeta();
  const { session, refreshSession } = useApp();
  const { t, tr, sign } = useI18n();
  const mission = useApi<Mission>(missionId && session?.citizen ? `/missions/${missionId}` : null);

  const [photo, setPhoto] = useState<File | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const [city, setCity] = useState("Coimbra");
  const [cityObj, setCityObj] = useState<City | null>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState("");
  const [locMsg, setLocMsg] = useState<Msg>({ key: "where.hint" });
  const [locating, setLocating] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<Msg | string>("");
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const errRef = useRef<HTMLParagraphElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const needsConsent = session ? !session.consented : false;

  // start position: the mission's spot, else the hero demo stream (Coimbra)
  useEffect(() => {
    if (pos) return;
    if (mission.data) { setPos([mission.data.position.lat, mission.data.position.lon]); setLocMsg({ key: "where.mission", vars: { place: mission.data.place } }); }
    else if (meta && !missionId) setPos(meta.start);
  }, [meta, mission.data, missionId, pos]);

  // a mission pre-selects its signs
  useEffect(() => {
    if (mission.data && codes.length === 0) setCodes(mission.data.signs.map((s) => s.code).filter((c) => c !== "all-clear"));
  }, [mission.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // every known stream, plus the lines of a city picked in this session (not in the cached meta yet)
  const streams = useMemo(() => [
    ...(meta?.streams.filter((s) => !cityObj?.lines || s.city !== cityObj.city).map((s) => s.line) ?? []),
    ...(cityObj?.lines?.map((l) => l.line) ?? []),
  ], [meta, cityObj]);

  if (session && !session.citizen) {
    return <Page title={t("nav.long.report")} eyebrow={t("report.eyebrow")}><SignIn role="citizen" onDone={refreshSession} /></Page>;
  }

  if (savedOffline) {
    return (
      <Page title={t("offline.title")} eyebrow={t("report.eyebrow")}>
        <div className="card stack-l" role="status">
          <Callout kind="info" title={t("offline.callout")} icon={<I.Cloud />}>{t("offline.text")}</Callout>
          <div className="btn-row">
            <button className="btn btn-prominent" onClick={() => { setSavedOffline(false); setCodes([]); setPhoto(null); setDescription(""); }}>
              <I.Plus /> {t("offline.another")}
            </button>
            <a className="btn" href="/reports">{t("nav.long.reports")}</a>
          </div>
        </div>
      </Page>
    );
  }

  const toggle = (code: string) => {
    setError("");
    setCodes((cur) => {
      if (code === "all-clear") return cur.includes(code) ? [] : [code];
      const rest = cur.filter((c) => c !== "all-clear");
      return rest.includes(code) ? rest.filter((c) => c !== code) : [...rest, code];
    });
  };

  const chooseCity = (c: City) => {
    const moved = c.city !== city || (cityObj?.city === c.city && cityObj.status === "pending" && accuracy === "");
    setCity(c.city);
    setCityObj(c.oah ? null : c);
    if (moved) { setPos(c.start); setAccuracy(""); setLocMsg({ key: "where.hint" }); }
  };

  const locate = () => {
    if (!navigator.geolocation) { setLocMsg({ key: "where.unavailable" }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => {
      setLocating(false);
      const here: [number, number] = [p.coords.latitude, p.coords.longitude];
      const all = [...(meta?.cities ?? []), ...(cityObj ? [cityObj] : [])];
      const near = all.map((c) => ({ c, d: distanceKm(here, c.start) })).sort((a, b) => a.d - b.d)[0];
      setPos(here);
      if (!near || near.d > 50) { setAccuracy(String(Math.round(p.coords.accuracy))); setLocMsg({ key: "where.far" }); return; }
      setCity(near.c.city);
      setAccuracy(String(Math.round(p.coords.accuracy)));
      setLocMsg({ key: "where.gps", vars: { m: Math.round(p.coords.accuracy) } });
    }, () => {
      setLocating(false);
      setLocMsg({ key: "where.nogps" });
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codes.length) {
      setError({ key: "err.sign" });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    if (needsConsent && !agree) {
      setError({ key: "err.consent" });
      requestAnimationFrame(() => { consentRef.current?.focus(); consentRef.current?.scrollIntoView({ block: "center" }); });
      return;
    }
    if (!pos) return;
    setBusy(true);
    const draft: Draft = {
      key: crypto.randomUUID(), saved_at: new Date().toISOString(), lat: pos[0], lon: pos[1], accuracy, codes,
      description, contact, mission_id: missionId, photo: photo ?? undefined, photo_name: photo?.name,
      consent: agree ? "1" : "",
    };
    // Offline: keep it on the device and confirm here (navigating would need the network).
    const keepOffline = async () => {
      await saveDraft(draft);
      window.dispatchEvent(new Event("outbox-change"));
      setSavedOffline(true);
      setBusy(false);
      window.scrollTo({ top: 0 });
    };
    try {
      if (!navigator.onLine) return await keepOffline();
      const r = await api<Report>("/reports", { form: formOf(draft) });
      refreshSession();
      router.push(`/reports/${r.id}?new=1`);
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.status === 0) return await keepOffline();
      if (e2.signin || e2.consent) { await refreshSession(); }
      setError(e2.consent ? { key: "err.consent" } : e2.message);
      setBusy(false);
    }
  };

  const errText = typeof error === "string" ? error : t(error.key, error.vars);
  const example = city !== "Coimbra" && Boolean(meta?.cities.find((c) => c.city === city)?.oah);

  return (
    <Page title={t("nav.long.report")} eyebrow={t("report.eyebrow")} subtitle={t("report.subtitle")}>
      <form onSubmit={submit} noValidate className="stack-l">
        {missionId && mission.data ? (
          <Callout kind="info" title={t("mission.banner", { id: mission.data.id })} icon={<I.Flag />}>{tr(mission.data.request)}</Callout>
        ) : null}

        {needsConsent ? (
          <div className="card stack">
            <h2 className="t-headline">{t("consent.title")}</h2>
            <dl className="kv t-callout">
              <dt>{t("consent.private")}</dt><dd>{t("consent.privateText")}</dd>
              <dt>{t("consent.public")}</dt><dd>{t("consent.publicText")}</dd>
              <dt>{t("consent.used")}</dt><dd>{t("consent.usedText")}</dd>
              <dt>{t("consent.rights")}</dt><dd>{t("consent.rightsText")}</dd>
              <dt>{t("consent.safe")}</dt><dd>{t("consent.safeText")}</dd>
            </dl>
            <label className="hstack" style={{ minHeight: 44, cursor: "pointer", gap: 12, flexWrap: "nowrap" }}>
              <input ref={consentRef} type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(""); }}
                style={{ width: 24, height: 24, accentColor: "var(--ink)", flex: "none" }} />
              <span>{t("consent.agree")}</span>
            </label>
          </div>
        ) : null}

        <Section title={t("photo.section")} n={1} foot={t("photo.foot")}>
          <PhotoField photo={photo} preview={preview} onChange={setPhoto} />
        </Section>

        <Section title={t("where.section")} n={2} foot={<>{t(locMsg.key, locMsg.vars)}{example ? <> {t("where.example")}</> : null}</>}>
          <div className="stack">
            {meta && !missionId ? <CityPicker value={city} label={t("where.city")} onChange={chooseCity} /> : null}
            {pos ? (
              <Map center={pos} streams={streams} label={t("where.map")}
                draggable={{ lat: pos[0], lon: pos[1], onMove: (lat, lon) => { setPos([lat, lon]); setAccuracy("10"); setLocMsg({ key: "where.confirmed" }); } }}>
                <button type="button" className="btn btn-sm" onClick={locate} disabled={locating}>
                  {locating ? <I.Spinner /> : <I.Locate />} {t("where.use")}
                </button>
              </Map>
            ) : <Skeleton h={260} />}
          </div>
        </Section>

        <Section title={t("see.section")} n={3} foot={t("see.foot")}>
          {meta ? (
            <div className="stack">
              <div className="chips" role="group" aria-label={t("see.section")}>
                {meta.signs.filter((s) => s.code !== "all-clear").map((s) => (
                  <button key={s.code} type="button" className="chip" aria-pressed={codes.includes(s.code)} onClick={() => toggle(s.code)}>
                    <I.Check /> {sign(s.code, s.chip)}
                  </button>
                ))}
              </div>
              <button type="button" className="chip fine" aria-pressed={codes.includes("all-clear")} onClick={() => toggle("all-clear")}>
                <I.Check /> {sign("all-clear")}
              </button>
            </div>
          ) : <Skeleton h={120} />}
        </Section>

        <Section title={t("else.section")} n={4}>
          <div className="stack">
            <div className="field">
              <label className="field-label" htmlFor="desc">{t("else.notes")}</label>
              <textarea id="desc" className="textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t("else.notesPh")} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="contact">{t("else.contact")}</label>
              <input id="contact" className="input" maxLength={200} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>
        </Section>

        <div className="sticky-action stack">
          {errText ? <p ref={errRef} tabIndex={-1} className="field-error" role="alert"><I.Warn width={18} height={18} /> {errText}</p> : null}
          <button className="btn btn-prominent btn-large btn-block" disabled={busy || !pos}>
            {busy ? <><I.Spinner /> {t("submitting")}</> : <>{t("submit")}</>}
          </button>
        </div>
      </form>
    </Page>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="page"><Skeleton n={4} h={120} /></div>}><ReportForm /></Suspense>;
}
