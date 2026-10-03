// A small line-icon set (24 px grid, 1.8 stroke). Decorative by default; pass a
// title only when the icon is the sole label of a control.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined} {...p}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const Camera = (p: P) => <Svg {...p}><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.5" /></Svg>;
export const Reports = (p: P) => <Svg {...p}><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M8 8.5h8M8 12h8M8 15.5h5" /></Svg>;
export const Shield = (p: P) => <Svg {...p}><path d="M12 3.2 5 6v5.6c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V6z" /><path d="m8.8 12.2 2.2 2.2 4.2-4.6" /></Svg>;
export const Brief = (p: P) => <Svg {...p}><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M8 16.5v-3M12 16.5v-6M16 16.5V8.5" /></Svg>;
export const Braces = (p: P) => <Svg {...p}><path d="M8.5 4C6.6 4 6 5 6 6.6v2.6C6 10.5 5.2 12 4 12c1.2 0 2 1.5 2 2.8v2.6C6 19 6.6 20 8.5 20M15.5 4c1.9 0 2.5 1 2.5 2.6v2.6c0 1.3.8 2.8 2 2.8-1.2 0-2 1.5-2 2.8v2.6c0 1.6-.6 2.6-2.5 2.6" /></Svg>;
export const ChevronRight = (p: P) => <Svg {...p}><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></Svg>;
export const ChevronLeft = (p: P) => <Svg {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Svg>;
export const Close = (p: P) => <Svg {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Svg>;
export const Check = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const CheckCircle = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.4 2.8 2.8L16.2 9.6" /></Svg>;
export const Warn = (p: P) => <Svg {...p}><path d="M10.3 4.2 2.9 17.3A2 2 0 0 0 4.6 20.3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" /><path d="M12 9.5v4M12 16.8v.1" /></Svg>;
export const XCircle = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></Svg>;
export const Info = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.1" /></Svg>;
export const Pin = (p: P) => <Svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Svg>;
export const Locate = (p: P) => <Svg {...p}><path d="M20 4 4 10.6l6.9 2.5L13.4 20z" /></Svg>;
export const Photo = (p: P) => <Svg {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></Svg>;
export const Plus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const More = (p: P) => <Svg {...p}><circle cx="6" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="18" cy="12" r="1" fill="currentColor" /></Svg>;
export const External = (p: P) => <Svg {...p}><path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v3.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10" /></Svg>;
export const Download = (p: P) => <Svg {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" /></Svg>;
export const Share = (p: P) => <Svg {...p}><path d="M12 15V4M8 7.5l4-4 4 4M7 11H6a2 2 0 0 0-2 2v5.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2h-1" /></Svg>;
export const Printer = (p: P) => <Svg {...p}><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="6.5" rx="1" /></Svg>;
export const Refresh = (p: P) => <Svg {...p}><path d="M20 11.5A8 8 0 1 0 17.7 17M20 5.5v6h-6" /></Svg>;
export const Seal = (p: P) => <Svg {...p}><circle cx="12" cy="9.5" r="6" /><path d="m9.5 9.6 1.8 1.8 3.3-3.6M8.5 14.5 7 21l5-2.5 5 2.5-1.5-6.5" /></Svg>;
export const Flag = (p: P) => <Svg {...p}><path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11" /></Svg>;
export const Person = (p: P) => <Svg {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c.8-3.6 3.9-5.8 7.5-5.8s6.7 2.2 7.5 5.8" /></Svg>;
export const Trash = (p: P) => <Svg {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" /></Svg>;
export const Clock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Svg>;
export const Map = (p: P) => <Svg {...p}><path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2zM9 4.5v13M15 6.5v13" /></Svg>;
export const List = (p: P) => <Svg {...p}><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.8" cy="6.5" r=".9" fill="currentColor" /><circle cx="4.8" cy="12" r=".9" fill="currentColor" /><circle cx="4.8" cy="17.5" r=".9" fill="currentColor" /></Svg>;
export const Copy = (p: P) => <Svg {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></Svg>;
export const Home = (p: P) => <Svg {...p}><path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" /></Svg>;
export const Cloud = (p: P) => <Svg {...p}><path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A4 4 0 0 1 17.5 18.5zM3 3l18 18" /></Svg>;
export const Spinner = (p: P) => <svg viewBox="0 0 24 24" className="spinner" aria-hidden {...p}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" /><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;

/** Status shape + colour: never colour alone. */
export function StatusIcon({ status }: { status: string }) {
  const cls = `status-ic ${status}`;
  if (status === "ok") return <CheckCircle className={cls} />;
  if (status === "warn") return <Warn className={cls} />;
  if (status === "fail") return <XCircle className={cls} />;
  return <Info className={cls} />;
}
