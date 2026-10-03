"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { signsText, useApi, when, type Mission } from "@/ui/api";
import * as I from "@/ui/icons";
import { Callout, Gate, Page, Section, Skeleton } from "@/ui/kit";
import { Map, useMeta } from "@/ui/Map";

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<Mission>(`/missions/${id}`);
  const meta = useMeta();
  const streams = useMemo(() => meta?.streams.map((s) => s.line) ?? [], [meta]);

  return (
    <Page title={`Mission ${id}`} eyebrow="Evidence needed" back={{ href: "/reports", label: "My reports" }}>
      <Gate q={q} skeleton={<Skeleton n={3} h={120} />}>
        {(m) => {
          const markers = [{ id: m.id, lat: m.position.lat, lon: m.position.lon, title: `Mission ${m.id}`, label: "" }];
          const circles = [{ lat: m.position.lat, lon: m.position.lon, radius: m.radius_m }];
          return (
            <>
              <div className="card section stack">
                <p className="eyebrow">({signsText(m.signs)})</p>
                <p className="t-title3">{m.request}</p>
                <p className="secondary t-sub">{m.place} · opened {when(m.created_at, { day: "numeric", month: "short" })} · {m.submissions} answer{m.submissions === 1 ? "" : "s"} so far</p>
              </div>
              <Section title="Where to look" n={1} foot={`Anywhere inside the circle (${m.radius_m} m). Location shown to about 10 m.`}>
                <Map center={[m.position.lat, m.position.lon]} streams={streams} markers={markers} circles={circles} label={`Mission area near ${m.place}`} />
              </Section>
              <div className="section"><Callout kind="warn" title="Stay safe">{m.safety}</Callout></div>
              <div className="sticky-action">
                {m.status === "open" ? (
                  <Link className="btn btn-prominent btn-large btn-block" href={`/report?mission=${m.id}`}><I.Camera /> Report for this mission</Link>
                ) : <p className="secondary">This mission is closed.</p>}
              </div>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
