import type { Metadata } from "next";
import "./(app)/app.css";

export const metadata: Metadata = { title: "Page not found · StreamProof" };

export default function GlobalNotFound() {
  return (
    <html lang="en-GB">
      <body>
        <main className="page" style={{ minHeight: "100dvh", display: "grid", alignContent: "center", paddingTop: 40, paddingBottom: 40 }}>
          <div className="card stack-l" style={{ padding: 28 }}>
            <div className="stack" style={{ gap: 6 }}>
              <p className="eyebrow">(404)</p>
              <h1 className="t-large">This page doesn't exist</h1>
              <p className="secondary">The link may be old, or the report may no longer be shareable.</p>
            </div>
            <div className="btn-row">
              <a className="btn btn-prominent" href="/report">Report a stream</a>
              <a className="btn" href="/">StreamProof website</a>
              <a className="btn btn-plain" href="/sign-in">Sign in</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
