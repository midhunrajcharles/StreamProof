"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signsText, useApi, when, type Rung, type Sign } from "@/ui/api";
import * as I from "@/ui/icons";
import { Gate, Grade, Ladder, Page, Skeleton } from "@/ui/kit";

type Card = { id: string; signs: Sign[]; rung: Rung; grade: string | null; reported_on: string; verified: boolean; area: string; all_clear: boolean };

export default function ShareCard() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<Card>(`/share/${id}`);
  return (
    <Page title="A stream report" eyebrow="Shared from StreamProof">
      <Gate q={q} skeleton={<Skeleton n={2} h={160} />}>
        {(c) => (
          <div className="stack-l">
            <div className="card stack-l" style={{ padding: 24 }}>
              <div className="hstack" style={{ gap: 16 }}>
                <Grade g={c.grade} size="md" />
                <div className="stack" style={{ gap: 4 }}>
                  <h2 className="t-title2">{c.all_clear ? `All clear near ${c.area}` : `${signsText(c.signs)} near ${c.area}`}</h2>
                  <p className="secondary">Reported {when(c.reported_on, { dateStyle: "long" })}</p>
                </div>
              </div>
              <Ladder rung={c.rung} />
              <p className="t-title3">
                {c.verified ? "Checked and verified by an expert. Thank you to everyone who helped document it."
                  : "Being checked. If you're nearby, you can help document it."}
              </p>
            </div>
            <p className="secondary t-foot"><I.Info width={14} height={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Area only. No names, contact details or exact locations are shown.</p>
            <div className="btn-row">
              <Link className="btn btn-prominent" href="/report"><I.Camera /> Report a stream</Link>
              <Link className="btn" href="/">What is StreamProof?</Link>
            </div>
          </div>
        )}
      </Gate>
    </Page>
  );
}
