// Landing page translation (server side). The language comes from the "sp-lang" cookie that both
// the landing page picker and the web app set; English text is the key, see ui/locales/.
import { cookies } from "next/headers";
import { fmt, isLang, loadDict, type Lang } from "@/ui/locales";

export async function landingLang(): Promise<Lang> {
  const v = (await cookies()).get("sp-lang")?.value;
  return isLang(v) ? v : "en";
}

export async function getLt() {
  const d = await loadDict(await landingLang());
  return (english: string, vars?: Record<string, string | number>) => fmt(d[english] ?? english, vars);
}
