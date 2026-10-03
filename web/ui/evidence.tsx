"use client";
import { when, type Report } from "./api";
import { localeOf, useI18n } from "./i18n";
import * as I from "./icons";

/** The event log. Notes stay as recorded (they are part of the audit trail). */
export function History({ r }: { r: Report }) {
  const { lang } = useI18n();
  return (
    <div className="card">
      <ol className="timeline">
        {[...r.history].reverse().map((e, i) => (
          <li key={i}>
            <p>{e.note}</p>
            <p className="secondary t-foot">{when(e.at, undefined, localeOf(lang))} · {e.by}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PhotoView({ r }: { r: Report }) {
  const { t, sign } = useI18n();
  if (r.photo?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="photo" src={r.photo.url} alt={`${r.id}: ${r.signs.map((s) => sign(s.code, s.chip)).join(", ")}`} />;
  }
  return (
    <div className="photo-none">
      <I.Photo width={32} height={32} />
      {r.photo?.synthetic ? t("photo.synthetic") : t("photo.none")}
    </div>
  );
}
