"use client";
import { useEffect } from "react";
import { useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Empty } from "@/ui/kit";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { tx } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="page" style={{ paddingTop: 40 }}>
      <div className="card">
        <Empty icon={<I.Warn />} title={tx("Something went wrong")} action={
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-prominent" onClick={reset}><I.Refresh /> {tx("Try again")}</button>
            <a className="btn" href="/reports">{tx("My reports")}</a>
          </div>
        }>
          {tx("This screen hit an unexpected error. Nothing you entered has been sent twice; reports saved offline stay on this device.")}
        </Empty>
      </div>
    </main>
  );
}
