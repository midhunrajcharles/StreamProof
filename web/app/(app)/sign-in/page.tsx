"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/ui/i18n";
import { CitizenSignIn, OrgSignIn, Page, Segmented, Skeleton } from "@/ui/kit";

function SignInPage() {
  const q = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const [role, setRole] = useState<"citizen" | "org">(q.get("role") === "org" ? "org" : "citizen");
  const next = q.get("next");
  const go = () => router.push(next && next.startsWith("/") && !["/home", "/dashboard"].includes(next) ? next : role === "org" ? "/dashboard" : "/home");
  return (
    <Page title={t("signin")} eyebrow="StreamProof">
      <div className="stack-l">
        <Segmented label={t("signin")} value={role} onChange={setRole}
          options={[{ value: "citizen", label: t("group.citizen") }, { value: "org", label: t("group.org") }]} />
        {role === "org" ? <OrgSignIn onDone={go} /> : <CitizenSignIn onDone={go} />}
      </div>
    </Page>
  );
}

export default function Page_() {
  return <Suspense fallback={<div className="page"><Skeleton n={2} h={160} /></div>}><SignInPage /></Suspense>;
}
