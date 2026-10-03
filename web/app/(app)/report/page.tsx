"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, useApi, type Mission, type Report } from "@/ui/api";
import * as I from "@/ui/icons";
import { Callout, Page, Section, SignIn, Skeleton, useApp } from "@/ui/kit";
import { Map, useMeta } from "@/ui/Map";
import { formOf, saveDraft, type Draft } from "@/ui/outbox";

const CONSENT_KEY = "sp-privacy-seen";

function distanceKm(a: [number, number], b: [number, number]) {
  const k = Math.PI / 180, x = (b[1] - a[1]) * k * Math.cos(((a[0] + b[0]) / 2) * k), y = (b[0] - a[0]) * k;
  return Math.hypot(x, y) * 6371;
}

function ReportForm() {
  const router = useRouter();
  const missionId = useSearchParams().get("mission") ?? "";
  const meta = useMeta();
  const { session, refreshSession, toast } = useApp();
  const mission = useApi<Mission>(missionId && session?.citizen ? `/missions/${missionId}` : null);

  const [photo, setPhoto] = useState<File | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const [pos, setPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState("");
  const [locMsg, setLocMsg] = useState("Drag the pin or tap the map to mark the spot.");
  const [locating, setLocating] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seenPrivacy, setSeenPrivacy] = useState(true);
  const [savedOffline, setSavedOffline] = useState(false);
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { try { setSeenPrivacy(localStorage.getItem(CONSENT_KEY) === "1"); } catch { /* private mode */ } }, []);

  // start position: the mission's spot, else the demo stream
  useEffect(() => {
    if (pos) return;
    if (mission.data) { setPos([mission.data.position.lat, mission.data.position.lon]); setLocMsg(`Mission spot: ${mission.data.place}. Adjust if you're elsewhere.`); }
    else if (meta && !missionId) setPos(meta.start);
  }, [meta, mission.data, missionId, pos]);

  // a mission pre-selects its signs
  useEffect(() => {
    if (mission.data && codes.length === 0) setCodes(mission.data.signs.map((s) => s.code).filter((c) => c !== "all-clear"));
  }, [mission.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const streams = useMemo(() => meta?.streams.map((s) => s.line) ?? [], [meta]);

  if (session && !session.citizen) {
    return <Page title="Report a stream" eyebrow="Citizen"><SignIn role="citizen" onDone={refreshSession} /></Page>;
  }

  if (savedOffline) {
    return (
      <Page title="Saved on this device" eyebrow="Citizen">
        <div className="card stack-l" role="status">
          <Callout kind="info" title="You're offline" icon={<I.Cloud />}>
            Your report and photo are kept on this device. They'll be sent and graded as soon as you're back online, even if you close the app.
          </Callout>
          <div className="btn-row">
            <button className="btn btn-prominent" onClick={() => { setSavedOffline(false); setCodes([]); setPhoto(null); setDescription(""); }}>
              <I.Plus /> Make another report
            </button>
            <a className="btn" href="/reports">My reports</a>
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

  const locate = () => {
    if (!navigator.geolocation) { setLocMsg("Location isn't available on this device. Place the pin on the map."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => {
      setLocating(false);
      const here: [number, number] = [p.coords.latitude, p.coords.longitude];
      if (meta && distanceKm(here, meta.start) > 50) {
        setLocMsg("You're outside the demo area (Coimbra). Place the pin on the stream instead.");
        return;
      }
      setPos(here);
      setAccuracy(String(Math.round(p.coords.accuracy)));
      setLocMsg(`Using your location (±${Math.round(p.coords.accuracy)} m).`);
    }, () => {
      setLocating(false);
      setLocMsg("Couldn't get your location. Place the pin on the map.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codes.length) {
      setError("Choose at least one thing you can see, or “Everything looks fine”.");
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    if (!pos) return;
    setBusy(true);
    const draft: Draft = {
      key: crypto.randomUUID(), saved_at: new Date().toISOString(), lat: pos[0], lon: pos[1], accuracy, codes,
      description, contact, mission_id: missionId, photo: photo ?? undefined, photo_name: photo?.name,
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
      try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ }
      router.push(`/reports/${r.id}?new=1`);
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.status === 0) return await keepOffline();
      if (e2.signin) { await refreshSession(); }
      setError(e2.message);
      setBusy(false);
    }
  };

  return (
    <Page title="Report a stream" eyebrow="Citizen" subtitle="About a minute. Your report is graded straight away, with reasons.">
      <form onSubmit={submit} noValidate className="stack-l">
        {missionId && mission.data ? (
          <Callout kind="info" title={`Evidence mission ${mission.data.id}`} icon={<I.Flag />}>{mission.data.request}</Callout>
        ) : null}

        {!seenPrivacy ? (
          <div className="card stack">
            <h2 className="t-headline">Before your first report</h2>
            <dl className="kv t-callout">
              <dt>Private</dt><dd>Your exact location and contact details. Only the reviewers see them.</dd>
              <dt>Can be public</dt><dd>The sign you saw and an area of about 100 m, and only after it has been checked.</dd>
              <dt>Stay safe</dt><dd>Stay on public paths, don't enter or touch the water, and don't photograph people.</dd>
            </dl>
            <div><button type="button" className="btn btn-sm" onClick={() => { setSeenPrivacy(true); try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ } }}>Got it</button></div>
          </div>
        ) : null}

        <Section title="Photo" n={1} foot="A wide shot of the water and the bank works best. Location data is removed from the file before it's stored.">
          <label className="photo-pick">
            <input type="file" accept="image/*" capture="environment" className="visually-hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your photo" />
            ) : (
              <>
                <I.Camera className="big" />
                <span className="t-headline" style={{ color: "var(--label)" }}>Take a photo</span>
                <span className="t-sub">Optional, but it lifts the grade</span>
              </>
            )}
          </label>
          {photo ? (
            <div className="btn-row" style={{ marginTop: 10 }}>
              <label className="btn btn-sm"><I.Photo /> Choose another
                <input type="file" accept="image/*" className="visually-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
              </label>
              <button type="button" className="btn btn-sm btn-destructive" onClick={() => setPhoto(null)}><I.Trash /> Remove</button>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <label className="btn btn-sm btn-plain" style={{ paddingLeft: 4 }}><I.Photo /> Choose from library
                <input type="file" accept="image/*" className="visually-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
              </label>
            </div>
          )}
        </Section>

        <Section title="Where" n={2} foot={locMsg}>
          {pos ? (
            <Map center={pos} streams={streams} label="Report location. Drag the pin or tap the map to move it."
              draggable={{ lat: pos[0], lon: pos[1], onMove: (lat, lon) => { setPos([lat, lon]); setAccuracy("10"); setLocMsg("Spot confirmed on the map."); } }}>
              <button type="button" className="btn btn-sm" onClick={locate} disabled={locating}>
                {locating ? <I.Spinner /> : <I.Locate />} Use my location
              </button>
            </Map>
          ) : <Skeleton h={260} />}
        </Section>

        <Section title="What do you see" n={3} foot="Tap everything that applies. “Everything looks fine” counts just as much.">
          {meta ? (
            <div className="stack">
              <div className="chips" role="group" aria-label="Signs">
                {meta.signs.filter((s) => s.code !== "all-clear").map((s) => (
                  <button key={s.code} type="button" className="chip" aria-pressed={codes.includes(s.code)} onClick={() => toggle(s.code)} title={s.definition}>
                    <I.Check /> {s.chip}
                  </button>
                ))}
              </div>
              <button type="button" className="chip fine" aria-pressed={codes.includes("all-clear")} onClick={() => toggle("all-clear")}>
                <I.Check /> Everything looks fine
              </button>
            </div>
          ) : <Skeleton h={120} />}
        </Section>

        <Section title="Anything else" n={4}>
          <div className="stack">
            <div className="field">
              <label className="field-label" htmlFor="desc">Notes (optional)</label>
              <textarea id="desc" className="textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="For example: side pool by the footbridge, lots of mosquitoes at dusk" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="contact">Email or phone for updates (optional, private)</label>
              <input id="contact" className="input" maxLength={200} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>
        </Section>

        <div className="sticky-action stack">
          {error ? <p ref={errRef} tabIndex={-1} className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
          <button className="btn btn-prominent btn-large btn-block" disabled={busy || !pos}>
            {busy ? <><I.Spinner /> Checking your evidence…</> : <>Submit report</>}
          </button>
        </div>
      </form>
    </Page>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="page"><Skeleton n={4} h={120} /></div>}><ReportForm /></Suspense>;
}
