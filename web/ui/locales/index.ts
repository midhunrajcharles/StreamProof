// Languages: English plus the other 23 official EU languages, and Norwegian (Oslo is a OneAquaHealth city).
// English is built in (ui/i18n.tsx); every other language is a JSON file here, loaded only when chosen.
// Keys are either ids ("nav.report") or, for organiser screens, the landing page and server sentences,
// the English text itself. Translations are machine-assisted and should be reviewed by native speakers.
// Shared by the web app (client) and the landing page (server).

export const LANGS = [
  { code: "en", name: "English" },
  { code: "bg", name: "Български" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "de", name: "Deutsch" },
  { code: "et", name: "Eesti" },
  { code: "el", name: "Ελληνικά" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "ga", name: "Gaeilge" },
  { code: "hr", name: "Hrvatski" },
  { code: "it", name: "Italiano" },
  { code: "lv", name: "Latviešu" },
  { code: "lt", name: "Lietuvių" },
  { code: "hu", name: "Magyar" },
  { code: "mt", name: "Malti" },
  { code: "nl", name: "Nederlands" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "sk", name: "Slovenčina" },
  { code: "sl", name: "Slovenščina" },
  { code: "fi", name: "Suomi" },
  { code: "sv", name: "Svenska" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
export type Dict = Record<string, string>;

export const isLang = (x: string | null | undefined): x is Lang => LANGS.some((l) => l.code === x);

/** Intl locale for dates and relative times ("no" -> Norwegian Bokmål). */
export const localeOf = (l: Lang) => (l === "no" ? "nb" : l);

const LOADERS: Record<Exclude<Lang, "en">, () => Promise<{ default: Dict }>> = {
  bg: () => import("./bg.json"), cs: () => import("./cs.json"), da: () => import("./da.json"), de: () => import("./de.json"),
  et: () => import("./et.json"), el: () => import("./el.json"), es: () => import("./es.json"), fr: () => import("./fr.json"),
  ga: () => import("./ga.json"), hr: () => import("./hr.json"), it: () => import("./it.json"), lv: () => import("./lv.json"),
  lt: () => import("./lt.json"), hu: () => import("./hu.json"), mt: () => import("./mt.json"), nl: () => import("./nl.json"),
  no: () => import("./no.json"), pl: () => import("./pl.json"), pt: () => import("./pt.json"), ro: () => import("./ro.json"),
  sk: () => import("./sk.json"), sl: () => import("./sl.json"), fi: () => import("./fi.json"), sv: () => import("./sv.json"),
};

const cache: Partial<Record<Lang, Dict>> = {};

/** The dictionary for a language ({} for English: English text is the fallback everywhere). */
export async function loadDict(l: Lang): Promise<Dict> {
  if (l === "en") return {};
  cache[l] ??= (await LOADERS[l]()).default;
  return cache[l]!;
}

export const cached = (l: Lang): Dict | undefined => (l === "en" ? {} : cache[l]);

export function fmt(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s;
}
