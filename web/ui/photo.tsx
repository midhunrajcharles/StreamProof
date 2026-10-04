"use client";
// Photo field: take a picture with the device camera in the page (live preview, then Capture), or upload one.
// Without a camera (or when access is blocked, or the page isn't a secure context) it says so and offers the upload.
// A phone that can't give the page the camera still opens its own camera app through the file input.
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";
import * as I from "./icons";

type Phase = "idle" | "opening" | "live" | "blocked" | "none";

export function PhotoField({ photo, preview, onChange }: { photo: File | null; preview: string | null; onChange: (f: File | null) => void }) {
  const { t, tx } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [canLive, setCanLive] = useState(false);
  const [cameras, setCameras] = useState(0);
  const [ready, setReady] = useState(false); // the first frame has arrived, so Capture has something to take
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    const md = navigator.mediaDevices;
    setCanLive(Boolean(md?.getUserMedia) && window.isSecureContext);
    md?.enumerateDevices?.().then((d) => {
      const n = d.filter((x) => x.kind === "videoinput").length;
      setCameras(n);
      if (n === 0 && typeof md.getUserMedia === "function") setPhase("none");
    }).catch(() => {});
    return stop;
  }, [stop]);

  const open = useCallback(async (side: "environment" | "user") => {
    stop();
    setReady(false);
    setPhase("opening");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: side }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      stream.current = s;
      setFacing(side);
      setPhase("live");
      const n = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter((x) => x.kind === "videoinput").length;
      setCameras(n);
    } catch (e) {
      const name = (e as DOMException).name;
      setPhase(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "none");
    }
  }, [stop]);

  // attach the stream once the <video> exists
  useEffect(() => {
    const v = video.current;
    if (phase === "live" && v && stream.current && v.srcObject !== stream.current) {
      v.srcObject = stream.current;
      v.play().catch(() => {});
    }
  }, [phase]);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      onChange(new File([b], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stop(); setPhase("idle");
    }, "image/jpeg", 0.92);
  };

  const cancel = () => { stop(); setPhase("idle"); };
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { onChange(f); e.target.value = ""; } };
  const cameraOff = phase === "blocked" || phase === "none";
  const viewing = phase === "opening" || phase === "live";

  return (
    <div className="stack">
      <div className="photo-pick photo-frame">
        {viewing ? (
          <>
            <video ref={video} className="photo-video" playsInline muted aria-label={tx("Camera preview")} onPlaying={() => setReady(true)} />
            {phase === "opening" || !ready ? <span className="photo-opening t-sub" role="status"><I.Spinner /> {tx("Opening the camera…")}</span> : null}
          </>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("photo.alt")} />
        ) : (
          <>
            <I.Camera className="big" />
            <span className="t-headline" style={{ color: "var(--label)" }}>{t("photo.take")}</span>
            <span className="t-sub">{t("photo.optional")}</span>
          </>
        )}
      </div>

      {viewing ? (
        <div className="btn-row">
          <button type="button" className="btn btn-prominent" onClick={capture} disabled={phase !== "live" || !ready}><I.Camera /> {tx("Capture")}</button>
          {cameras > 1 ? <button type="button" className="btn btn-sm" onClick={() => open(facing === "environment" ? "user" : "environment")}>{tx("Switch camera")}</button> : null}
          <button type="button" className="btn btn-plain" onClick={cancel}>{tx("Cancel")}</button>
        </div>
      ) : (
        <>
          {cameraOff ? (
            <p className="field-help photo-note" role="status"><I.Info width={16} height={16} /> {phase === "blocked" ? tx("Camera access was blocked. Allow it in your browser settings, or upload a photo instead.") : tx("No camera was found on this device. Upload a photo instead.")}</p>
          ) : null}
          <div className="btn-row">
            {!cameraOff ? (canLive ? (
              <button type="button" className={`btn ${photo ? "btn-sm" : "btn-prominent"}`} onClick={() => open(facing)}><I.Camera /> {t("photo.take")}</button>
            ) : (
              // no live camera for the page (older or insecure origin): a phone still opens its camera app from here
              <label className={`btn ${photo ? "btn-sm" : "btn-prominent"}`}><I.Camera /> {t("photo.take")}
                <input type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={pick} />
              </label>
            )) : null}
            <label className={`btn ${cameraOff && !photo ? "btn-prominent" : "btn-sm"}`}><I.Photo /> {tx("Upload a photo")}
              <input type="file" accept="image/*" className="visually-hidden" onChange={pick} />
            </label>
            {photo ? <button type="button" className="btn btn-sm btn-destructive" onClick={() => onChange(null)}><I.Trash /> {t("photo.remove")}</button> : null}
          </div>
        </>
      )}
    </div>
  );
}
