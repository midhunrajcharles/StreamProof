"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Avatar } from "./avatar";
import * as I from "./icons";
import { I18nProvider, useI18n } from "./i18n";
import { AppProvider, useApp } from "./kit";
import { flush } from "./outbox";
import { SignOut } from "./profile";

const NAV = [
  { group: "group.citizen", items: [
    { href: "/report", key: "report", icon: I.Camera },
    { href: "/reports", key: "reports", icon: I.Reports },
  ] },
  { group: "group.org", items: [
    { href: "/review", key: "review", icon: I.Shield },
    { href: "/brief", key: "brief", icon: I.Brief },
  ] },
  { group: "group.open", items: [
    { href: "/standards", key: "standards", icon: I.Braces },
  ] },
];

const ALL = NAV.flatMap((g) => g.items);
const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Sidebar() {
  const path = usePathname();
  const { session } = useApp();
  const { t } = useI18n();
  return (
    <nav className="sidebar" aria-label="Sections">
      <Link href="/" className="brand" aria-label="StreamProof website">
        <span className="brand-word">STREAMPROOF</span>
      </Link>
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="side-group eyebrow">({t(g.group)})</p>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className="side-link" aria-current={isActive(path, it.href) ? "page" : undefined}>
              <it.icon /> {t(`nav.long.${it.key}`) === `nav.long.${it.key}` ? t(`nav.${it.key}`) : t(`nav.long.${it.key}`)}
            </Link>
          ))}
        </div>
      ))}
      <div className="side-foot">
        {session?.citizen ? (
          <div className="side-who">
            <Link href="/account" className="side-link" aria-current={isActive(path, "/account") ? "page" : undefined}>
              <Avatar name={session.citizen.name} colour={session.citizen.avatar} size={30} />
              <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                <span className="side-name">{session.citizen.name}</span>
                <span className="t-foot side-sub">{t("group.citizen")}{session.citizen.demo ? " · demo" : ""}</span>
              </span>
            </Link>
            <SignOut role="citizen" variant="icon" after={() => setTimeout(() => window.location.reload(), 600)} />
          </div>
        ) : null}
        {session?.org ? (
          <div className="side-who">
            <Link href="/account" className="side-link" aria-current={isActive(path, "/account") && !session.citizen ? "page" : undefined}>
              <Avatar name={session.org.name} colour={session.org.avatar} size={30} />
              <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                <span className="side-name">{session.org.name}</span>
                <span className="t-foot side-sub">{session.org.role === "admin" ? "Admin" : "Reviewer"}{session.org.city ? ` · ${session.org.city}` : ""}</span>
              </span>
            </Link>
            <SignOut role="org" variant="icon" after={() => setTimeout(() => window.location.reload(), 600)} />
          </div>
        ) : null}
        {!session?.citizen && !session?.org ? (
          <div className="hstack" style={{ gap: 8, flexWrap: "nowrap" }}>
            <Link className="btn btn-sm btn-prominent" href="/sign-in" style={{ flex: 1 }}>{t("signin")}</Link>
            <Link className="btn btn-sm" href="/sign-up" style={{ flex: 1 }}>{t("signup")}</Link>
          </div>
        ) : null}
        <Link href="/" className="side-link t-sub" style={{ minHeight: 40 }}><I.Home /> {t("website")}</Link>
      </div>
    </nav>
  );
}

function TabBar() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label="Sections">
      {ALL.map((it) => (
        <Link key={it.href} href={it.href} className="tab" aria-current={isActive(path, it.href) ? "page" : undefined}>
          <it.icon /> <span>{t(`nav.${it.key}`)}</span>
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
      <I18nProvider>
      <a href="#content" className="skip-link">Skip to content</a>
      <div className="shell">
        <Sidebar />
        <TabBar />
        <div className="main">{children}</div>
      </div>
      <Background />
      </I18nProvider>
    </AppProvider>
  );
}
