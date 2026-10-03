"use client";
import { signsText, when, type Report } from "./api";
import * as I from "./icons";

export function History({ r }: { r: Report }) {
  return (
    <div className="card">
      <ol className="timeline">
        {[...r.history].reverse().map((e, i) => (
          <li key={i}>
            <p>{e.note}</p>
            <p className="secondary t-foot">{when(e.at)} · {e.by}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PhotoView({ r }: { r: Report }) {
  if (r.photo?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="photo" src={r.photo.url} alt={`Photo for report ${r.id}: ${signsText(r.signs)}`} />;
  }
  return (
    <div className="photo-none">
      <I.Photo width={32} height={32} />
      {r.photo?.synthetic ? "Synthetic demo report: photo metrics only, no image stored." : "No photo with this report."}
    </div>
  );
}
