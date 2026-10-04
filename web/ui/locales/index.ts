// Languages: European ones first (the 24 official EU languages, Norwegian for Oslo, Russian and Ukrainian), then
// 23 widely spoken world languages, each group A to Z by English name. The pickers show each language in its own
// name only. Arabic, Hebrew, Persian and Urdu are written right to left.
// English is built in (ui/i18n.tsx); every other language is a JSON file here, loaded only when chosen.
// Keys are either ids ("nav.report") or, for organiser screens, the landing page and server sentences,
// the English text itself. Translations are machine-assisted and should be reviewed by native speakers.
// Shared by the web app (client) and the landing page (server).

export const LANGS = [
  // European languages first (A to Z by English name), then world languages (A to Z)
  { code: "bg", name: "Български", en: "Bulgarian", group: "europe" },
  { code: "hr", name: "Hrvatski", en: "Croatian", group: "europe" },
  { code: "cs", name: "Čeština", en: "Czech", group: "europe" },
  { code: "da", name: "Dansk", en: "Danish", group: "europe" },
  { code: "nl", name: "Nederlands", en: "Dutch", group: "europe" },
  { code: "en", name: "English", en: "English", group: "europe" },
  { code: "et", name: "Eesti", en: "Estonian", group: "europe" },
  { code: "fi", name: "Suomi", en: "Finnish", group: "europe" },
  { code: "fr", name: "Français", en: "French", group: "europe" },
  { code: "de", name: "Deutsch", en: "German", group: "europe" },
  { code: "el", name: "Ελληνικά", en: "Greek", group: "europe" },
  { code: "hu", name: "Magyar", en: "Hungarian", group: "europe" },
  { code: "ga", name: "Gaeilge", en: "Irish", group: "europe" },
  { code: "it", name: "Italiano", en: "Italian", group: "europe" },
  { code: "lv", name: "Latviešu", en: "Latvian", group: "europe" },
  { code: "lt", name: "Lietuvių", en: "Lithuanian", group: "europe" },
  { code: "mt", name: "Malti", en: "Maltese", group: "europe" },
  { code: "no", name: "Norsk", en: "Norwegian", group: "europe" },
  { code: "pl", name: "Polski", en: "Polish", group: "europe" },
  { code: "pt", name: "Português", en: "Portuguese", group: "europe" },
  { code: "ro", name: "Română", en: "Romanian", group: "europe" },
  { code: "ru", name: "Русский", en: "Russian", group: "europe" },
  { code: "sk", name: "Slovenčina", en: "Slovak", group: "europe" },
  { code: "sl", name: "Slovenščina", en: "Slovenian", group: "europe" },
  { code: "es", name: "Español", en: "Spanish", group: "europe" },
  { code: "sv", name: "Svenska", en: "Swedish", group: "europe" },
  { code: "uk", name: "Українська", en: "Ukrainian", group: "europe" },
  { code: "ar", name: "العربية", en: "Arabic", group: "world", rtl: true },
  { code: "bn", name: "বাংলা", en: "Bengali", group: "world" },
  { code: "zh", name: "中文", en: "Chinese", group: "world" },
  { code: "fil", name: "Filipino", en: "Filipino", group: "world" },
  { code: "gu", name: "ગુજરાતી", en: "Gujarati", group: "world" },
  { code: "he", name: "עברית", en: "Hebrew", group: "world", rtl: true },
  { code: "hi", name: "हिन्दी", en: "Hindi", group: "world" },
  { code: "id", name: "Bahasa Indonesia", en: "Indonesian", group: "world" },
  { code: "ja", name: "日本語", en: "Japanese", group: "world" },
  { code: "kn", name: "ಕನ್ನಡ", en: "Kannada", group: "world" },
  { code: "ko", name: "한국어", en: "Korean", group: "world" },
  { code: "ms", name: "Bahasa Melayu", en: "Malay", group: "world" },
  { code: "ml", name: "മലയാളം", en: "Malayalam", group: "world" },
  { code: "mr", name: "मराठी", en: "Marathi", group: "world" },
  { code: "fa", name: "فارسی", en: "Persian", group: "world", rtl: true },
  { code: "pa", name: "ਪੰਜਾਬੀ", en: "Punjabi", group: "world" },
  { code: "sw", name: "Kiswahili", en: "Swahili", group: "world" },
  { code: "ta", name: "தமிழ்", en: "Tamil", group: "world" },
  { code: "te", name: "తెలుగు", en: "Telugu", group: "world" },
  { code: "th", name: "ไทย", en: "Thai", group: "world" },
  { code: "tr", name: "Türkçe", en: "Turkish", group: "world" },
  { code: "ur", name: "اردو", en: "Urdu", group: "world", rtl: true },
  { code: "vi", name: "Tiếng Việt", en: "Vietnamese", group: "world" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
export type Dict = Record<string, string>;

export const isLang = (x: string | null | undefined): x is Lang => LANGS.some((l) => l.code === x);

/** "rtl" for Arabic, Hebrew, Persian and Urdu. */
export const dirOf = (l: Lang): "rtl" | "ltr" => (LANGS.find((x) => x.code === l) as { rtl?: boolean } | undefined)?.rtl ? "rtl" : "ltr";

/** A browser language tag ("pt-BR", "iw", "nb") to one of ours, or null. */
export function fromBrowser(tag: string): Lang | null {
  const t = tag.toLowerCase();
  const base = t.split("-")[0];
  const alias: Record<string, string> = { nb: "no", nn: "no", iw: "he", in: "id", tl: "fil" };
  const code = alias[base] ?? base;
  return isLang(code) ? code : null;
}

/** Intl locale for dates and relative times ("no" -> Norwegian Bokmål). */
export const localeOf = (l: Lang) => (l === "no" ? "nb" : l);

const LOADERS: Record<Exclude<Lang, "en">, () => Promise<{ default: Dict }>> = {
  ar: () => import("./ar.json"), bn: () => import("./bn.json"), bg: () => import("./bg.json"), zh: () => import("./zh.json"),
  hr: () => import("./hr.json"), cs: () => import("./cs.json"), da: () => import("./da.json"), nl: () => import("./nl.json"),
  et: () => import("./et.json"), fil: () => import("./fil.json"), fi: () => import("./fi.json"), fr: () => import("./fr.json"),
  de: () => import("./de.json"), el: () => import("./el.json"), gu: () => import("./gu.json"), he: () => import("./he.json"),
  hi: () => import("./hi.json"), hu: () => import("./hu.json"), id: () => import("./id.json"), ga: () => import("./ga.json"),
  it: () => import("./it.json"), ja: () => import("./ja.json"), kn: () => import("./kn.json"), ko: () => import("./ko.json"),
  lv: () => import("./lv.json"), lt: () => import("./lt.json"), ms: () => import("./ms.json"), ml: () => import("./ml.json"),
  mt: () => import("./mt.json"), mr: () => import("./mr.json"), no: () => import("./no.json"), fa: () => import("./fa.json"),
  pl: () => import("./pl.json"), pt: () => import("./pt.json"), pa: () => import("./pa.json"), ro: () => import("./ro.json"),
  ru: () => import("./ru.json"), sk: () => import("./sk.json"), sl: () => import("./sl.json"), es: () => import("./es.json"),
  sw: () => import("./sw.json"), sv: () => import("./sv.json"), ta: () => import("./ta.json"), te: () => import("./te.json"),
  th: () => import("./th.json"), tr: () => import("./tr.json"), uk: () => import("./uk.json"), ur: () => import("./ur.json"),
  vi: () => import("./vi.json"),
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
