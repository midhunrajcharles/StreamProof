"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Avatar } from "./avatar";
import * as I from "./icons";
import { I18nProvider, useI18n } from "./i18n";
import { AppProvider, useApp, type Mode } from "./kit";
import { flush } from "./outbox";
import { SignOut } from "./profile";

type Item = { href: string; key: string; icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement };

/** Each role has its own navigation; Standards (open data) is shown to everyone. */
const NAV: Record<Mode, Item[]> = {
  citizen: [
    { href: "/home", key: "home", icon: I.Home },
    { href: "/report", key: "report", icon: I.Camera },
    { href: "/reports", key: "reports", icon: I.Reports },
  ],
  org: [
    { href: "/dashboard", key: "dashboard", icon: I.Grid },
    { href: "/review", key: "review", icon: I.Shield },
    { href: "/brief", key: "brief", icon: I.Brief },
  ],
  guest: [
    { href: "/start", key: "start", icon: I.ArrowRight },
  ],
};
const OPEN: Item = { href: "/standards", key: "standards", icon: I.Braces };
const ORG_PATHS = ["/dashboard", "/review", "/brief"];
const CITIZEN_PATHS = ["/home", "/report", "/reports", "/missions"];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

/** Opening a page that belongs to one role switches the view to that role (when you're signed in as both). */
function useModeFromPath() {
  const path = usePathname();
  const { session, setMode } = useApp();
  useEffect(() => {
    if (!session?.org || !session?.citizen) return;
    if (ORG_PATHS.some((p) => isActive(path, p))) setMode("org");
    else if (CITIZEN_PATHS.some((p) => isActive(path, p))) setMode("citizen");
  }, [path, session, setMode]);
}

function label(t: (k: string) => string, key: string) {
  const long = t(`nav.long.${key}`);
  return long === `nav.long.${key}` ? t(`nav.${key}`) : long;
}

function Sidebar() {
  const path = usePathname();
  const { session, mode, setMode } = useApp();
  const { t, tx } = useI18n();
  const items = NAV[mode];
  const other = mode === "org" ? "citizen" : "org";
  const both = Boolean(session?.org && session?.citizen);
  return (
    <nav className="sidebar" aria-label={t("nav.sections")}>
      <Link href="/" className="brand" aria-label={t("website")}>
        <span className="brand-word">STREAMPROOF</span>
      </Link>
      <div>
        <p className="side-group eyebrow">({mode === "guest" ? "StreamProof" : t(mode === "org" ? "group.org" : "group.citizen")})</p>
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="side-link" aria-current={isActive(path, it.href) ? "page" : undefined}>
            <it.icon /> {label(t, it.key)}
          </Link>
        ))}
        {both ? (
          <Link href={other === "org" ? "/dashboard" : "/home"} className="side-link" onClick={() => setMode(other)}>
            <I.Swap /> {t(other === "org" ? "mode.toOrg" : "mode.toCitizen")}
          </Link>
        ) : null}
      </div>
      <div>
        <p className="side-group eyebrow">({t("group.open")})</p>
        <Link href={OPEN.href} className="side-link" aria-current={isActive(path, OPEN.href) ? "page" : undefined}>
          <OPEN.icon /> {label(t, OPEN.key)}
        </Link>
      </div>
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
                <span className="t-foot side-sub">{session.org.role === "admin" ? tx("Admin") : tx("Reviewer")}{session.org.city ? ` · ${session.org.city}` : ""}</span>
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
  const { mode } = useApp();
  const { t } = useI18n();
  const items = [...NAV[mode], ...(mode === "citizen" ? [] : [OPEN])];
  return (
    <nav className="tabbar" aria-label={t("nav.sections")}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="tab" aria-current={isActive(path, it.href) ? "page" : undefined}>
          <it.icon /> <span>{t(`nav.${it.key}`)}</span>
        </Link>
      ))}
    </nav>
  );
}

function SkipLink() {
  const { tx } = useI18n();
  return <a href="#content" className="skip-link">{tx("Skip to content")}</a>;
}

function ModeFromPath() { useModeFromPath(); return null; }

/** Sends saved offline reports when the connection comes back, and registers the service worker. */
function Background() {
  const { toast } = useApp();
  const { tx } = useI18n();
  useEffect(() => {
    const send = async () => {
      const sent = await flush();
      if (sent.length) toast(sent.length === 1 ? tx("Saved report sent: {id}", { id: sent[0].id }) : tx("{n} saved reports sent", { n: sent.length }));
    };
    send();
    window.addEventListener("online", send);
    const offline = () => toast(tx("You're offline. New reports are saved on this device."), "info");
    window.addEventListener("offline", offline);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => { window.removeEventListener("online", send); window.removeEventListener("offline", offline); };
  }, [toast, tx]);
  return null;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <I18nProvider>
      <SkipLink />
      <ModeFromPath />
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
