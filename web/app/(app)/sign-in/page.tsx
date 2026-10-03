"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CitizenStart, OrgSignIn, Page, Segmented, Skeleton } from "@/ui/kit";

function SignInPage() {
  const q = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<"citizen" | "org">(q.get("role") === "org" ? "org" : "citizen");
  const next = q.get("next");
  const go = () => router.push(next && next.startsWith("/") ? next : role === "org" ? "/review" : "/report");
  return (
    <Page title="Sign in" eyebrow="StreamProof">
      <div className="stack-l">
        <Segmented label="I am" value={role} onChange={setRole}
          options={[{ value: "citizen", label: "A citizen" }, { value: "org", label: "An organisation" }]} />
        {role === "org" ? <OrgSignIn onDone={go} /> : <CitizenStart onDone={go} />}
      </div>
    </Page>
  );
}

export default function Page_() {
  return <Suspense fallback={<div className="page"><Skeleton n={2} h={160} /></div>}><SignInPage /></Suspense>;
}
