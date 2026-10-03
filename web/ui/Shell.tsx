"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "./api";
import * as I from "./icons";
import { AppProvider, useApp } from "./kit";
import { flush } from "./outbox";

const NAV = [
  { group: "Citizen", items: [
    { href: "/report", label: "Report", long: "Report a stream", icon: I.Camera },
    { href: "/reports", label: "Reports", long: "My reports", icon: I.Reports },
  ] },
  { group: "Organisation", items: [
    { href: "/review", label: "Review", long: "Review queue", icon: I.Shield },
    { href: "/brief", label: "Brief", long: "River Health Brief", icon: I.Brief },
  ] },
  { group: "Open data", items: [
    { href: "/standards", label: "Standards", long: "Standards", icon: I.Braces },
  ] },
];

const ALL = NAV.flatMap((g) => g.items);
const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Sidebar() {
  const path = usePathname();
  const { session, refreshSession, toast } = useApp();
  return (
    <nav className="sidebar" aria-label="Sections">
      <Link href="/" className="brand" aria-label="StreamProof website">
        <span className="brand-word">STREAMPROOF</span>
      </Link>
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="side-group eyebrow">({g.group})</p>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className="side-link" aria-current={isActive(path, it.href) ? "page" : undefined}>
              <it.icon /> {it.long}
            </Link>
          ))}
        </div>
      ))}
      <div className="side-foot">
        <Link href="/account" className="side-link" aria-current={isActive(path, "/account") ? "page" : undefined} style={{ minHeight: 52 }}>
          <I.Person />
          <span className="stack" style={{ gap: 0 }}>
            <span>{session?.org ? session.org.name : session?.citizen ? session.citizen.name : "Account"}</span>
            <span className="t-foot" style={{ opacity: 0.75, fontWeight: 400 }}>
              {session?.org ? (session.org.role === "admin" ? "Admin" : "Reviewer") : session?.citizen ? "Citizen" : "Not signed in"}
            </span>
          </span>
        </Link>
        {session?.citizen || session?.org ? (
          <button className="btn btn-sm" onClick={async () => {
            await api("/session", { method: "DELETE" });
            await refreshSession();
            toast("Signed out", "info");
            setTimeout(() => window.location.reload(), 600);
          }}>Sign out</button>
        ) : <Link className="btn btn-sm btn-prominent" href="/sign-in">Sign in</Link>}
        <Link href="/" className="side-link t-sub" style={{ minHeight: 40 }}><I.Home /> StreamProof website</Link>
      </div>
    </nav>
  );
}

function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Sections">
      {ALL.map((it) => (
        <Link key={it.href} href={it.href} className="tab" aria-current={isActive(path, it.href) ? "page" : undefined}>
          <it.icon /> <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Sends saved offline reports when the connection comes back, and registers the service worker. */
function Background() {
  const { toast } = useApp();
  useEffect(() => {
    const send = async () => {
      const sent = await flush();
      if (sent.length) toast(sent.length === 1 ? `Saved report sent: ${sent[0].id}` : `${sent.length} saved reports sent`);
    };
    send();
    window.addEventListener("online", send);
    const offline = () => toast("You're offline. New reports are saved on this device.", "info");
    window.addEventListener("offline", offline);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => { window.removeEventListener("online", send); window.removeEventListener("offline", offline); };
  }, [toast]);
  return null;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <a href="#content" className="skip-link">Skip to content</a>
      <div className="shell">
        <Sidebar />
        <TabBar />
        <div className="main">{children}</div>
      </div>
      <Background />
    </AppProvider>
  );
}
