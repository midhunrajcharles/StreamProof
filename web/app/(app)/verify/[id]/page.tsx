"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, useApi, when } from "@/ui/api";
import * as I from "@/ui/icons";
import { Callout, Gate, Page, Section, Skeleton } from "@/ui/kit";

type Check = {
  id: string; ok: boolean; message: string; edited: boolean; record: Record<string, unknown>;
  sha256: string; signature: string; alg: string; public_key: string; signed_by: string; issued: string;
};

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<Check>(`/verify/${id}`);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (q.data) { setText(JSON.stringify(q.data.record, null, 2)); setResult(q.data); } }, [q.data]);

  const check = async () => {
    setBusy(true);
    setError("");
    try { setResult(await api<Check>(`/verify/${id}`, { form: { record_json: text } })); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  };

  return (
    <Page title="Check a record" eyebrow="Public" subtitle={`Contribution record ${id}`}>
      <Gate q={q} skeleton={<Skeleton n={3} h={110} />}>
        {(base) => {
          const r = result ?? base;
          return (
            <>
              <div className="card section" aria-live="polite">
                <div className="hstack" style={{ gap: 16 }}>
                  {r.ok ? <I.CheckCircle width={56} height={56} style={{ color: "var(--ok)" }} /> : <I.XCircle width={56} height={56} style={{ color: "var(--bad)" }} />}
                  <div className="stack" style={{ gap: 4 }}>
                    <h2 className="t-title1">{r.ok ? "Signature valid" : "Doesn't match"}</h2>
                    <p className="secondary">{r.message}{r.edited ? " (checked your edited version)" : ""}</p>
                  </div>
                </div>
              </div>

              <Section title="Signature" n={1} foot="A signature over a hash of the de-identified record: tamper-evident and simple. Not a blockchain, and a person's identity can still be erased.">
                <div className="card">
                  <dl className="kv">
                    <dt>Signed by</dt><dd>{base.signed_by}</dd>
                    <dt>Issued</dt><dd>{when(base.issued, { dateStyle: "medium", timeStyle: "short" })}</dd>
                    <dt>Algorithm</dt><dd>{base.alg}</dd>
                    <dt>SHA-256</dt><dd className="mono t-foot wrap-anywhere">{base.sha256}</dd>
                    <dt>Public key</dt><dd className="mono t-foot wrap-anywhere">{base.public_key}</dd>
                  </dl>
                </div>
              </Section>

              <Section title="Try to change it" n={2} foot="Edit any value, for example the grade, then check again. Any change breaks the signature.">
                <div className="stack">
                  <label className="visually-hidden" htmlFor="rec">Record JSON</label>
                  <textarea id="rec" className="code" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
                  {error ? <Callout kind="bad">{error}</Callout> : null}
                  <div className="btn-row">
                    <button className="btn btn-prominent" onClick={check} disabled={busy}>{busy ? <I.Spinner /> : <I.Shield />} Check this version</button>
                    <button className="btn" onClick={() => { setText(JSON.stringify(base.record, null, 2)); setResult(base); setError(""); }}><I.Refresh /> Restore original</button>
                  </div>
                </div>
              </Section>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
