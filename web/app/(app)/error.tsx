"use client";
import { useEffect } from "react";
import * as I from "@/ui/icons";
import { Empty } from "@/ui/kit";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="page" style={{ paddingTop: 40 }}>
      <div className="card">
        <Empty icon={<I.Warn />} title="Something went wrong" action={
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-prominent" onClick={reset}><I.Refresh /> Try again</button>
            <a className="btn" href="/reports">My reports</a>
          </div>
        }>
          This screen hit an unexpected error. Nothing you entered has been sent twice; reports saved offline stay on this device.
        </Empty>
      </div>
    </main>
  );
}
