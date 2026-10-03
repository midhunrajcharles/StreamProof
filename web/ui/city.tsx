"use client";
// City picker: the five OneAquaHealth cities as quick picks, plus a search for any other city.
// Picking a new city registers it; the server then fetches its streams (OpenStreetMap) and rainfall.
import { useEffect, useId, useRef, useState } from "react";
import { api, ApiError, type City, type CityHit } from "./api";
import { useI18n } from "./i18n";
import * as I from "./icons";
import { useMeta } from "./Map";

async function follow(name: string, onUpdate: (c: City) => void) {
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const c = await api<City>(`/cities/${encodeURIComponent(name)}`).catch(() => null);
    if (!c) return;
    onUpdate(c);
    if (c.status !== "pending") return;
  }
}

export function CityStatus({ city }: { city: City | null }) {
  const { t } = useI18n();
  if (!city || city.oah) return null;
  const msg = city.status === "pending" ? t("city.loading", { city: city.city })
    : city.status === "ready" ? t("city.ready", { n: city.streams, city: city.city })
    : city.status === "no-streams" ? t("city.noStreams", { city: city.city })
    : t("city.unavailable", { city: city.city });
  return (
    <p className={`field-help city-status ${city.status}`} role="status">
      {city.status === "pending" ? <I.Spinner width={14} height={14} /> : city.status === "ready" ? <I.Check width={14} height={14} /> : <I.Info width={14} height={14} />} {msg}
    </p>
  );
}

export function CityPicker({ value, onChange, label }: { value: string; onChange: (c: City) => void; label: string }) {
  const { t, lang } = useI18n();
  const meta = useMeta();
  const oah = meta?.cities.filter((c) => c.oah) ?? [];
  const [picked, setPicked] = useState<City | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CityHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listId = useId();
  const labelId = useId();
  const seq = useRef(0);

  const update = (c: City) => { setPicked(c); onChange(c); };

  // a saved value that isn't one of the five (e.g. a profile city): load it so it shows as selected
  useEffect(() => {
    if (!value || !meta || meta.cities.some((c) => c.city === value && c.oah) || picked?.city === value) return;
    api<City>(`/cities/${encodeURIComponent(value)}`).then((c) => setPicked(c)).catch(() => {});
  }, [value, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setError(""); return; }
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api<{ results: CityHit[] }>(`/cities/search?q=${encodeURIComponent(term)}&lang=${lang}`);
        if (n !== seq.current) return;
        setHits(r.results); setActive(r.results.length ? 0 : -1); setOpen(true); setError("");
      } catch (e) {
        if (n === seq.current) setError((e as ApiError).status === 0 ? t("city.offline") : (e as ApiError).message);
      } finally { if (n === seq.current) setBusy(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, lang, t]);

  const choose = async (h: CityHit) => {
    setOpen(false); setQ(""); setHits([]);
    try {
      const c = await api<City>("/cities", { form: { name: h.name, country: h.country, cc: h.cc, lat: String(h.lat), lon: String(h.lon), bbox: h.bbox ? JSON.stringify(h.bbox) : "" } });
      const full = await api<City>(`/cities/${encodeURIComponent(c.city)}`).catch(() => c);
      update(full);
      if (full.status === "pending") follow(full.city, update);
    } catch (e) { setError((e as ApiError).message); }
  };

  const chips = [...oah, ...(picked && !picked.oah ? [picked] : [])];
  return (
    <div className="field city-picker">
      <span className="field-label" id={labelId}>{label}</span>
      <div className="chips city-chips" role="radiogroup" aria-labelledby={labelId}>
        {chips.map((c) => (
          <button key={c.city} type="button" role="radio" aria-checked={c.city === value} className="chip"
            onClick={() => { if (c.oah) { setPicked(null); onChange(c); } else update(c); }}>
            <I.Check /> {c.city}{!c.oah && c.country ? <span className="chip-sub">{c.cc.toUpperCase()}</span> : null}
          </button>
        ))}
      </div>
      <div className="combo">
        <I.Globe className="combo-ic" aria-hidden />
        <input className="input combo-input" type="search" role="combobox" aria-expanded={open && hits.length > 0} aria-controls={listId}
          aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={t("city.search")} placeholder={t("city.searchPh")} value={q} autoComplete="off"
          onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && open && hits[active]) { e.preventDefault(); choose(hits[active]); }
            else if (e.key === "Escape") setOpen(false);
          }} />
        {busy ? <I.Spinner className="combo-spin" aria-hidden /> : null}
        {open && q.trim().length >= 2 ? (
          <ul className="combo-list" role="listbox" id={listId} aria-label={t("city.search")}>
            {hits.length ? hits.map((h, i) => (
              <li key={`${h.name}-${h.cc}-${h.lat}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} className="combo-opt"
                onMouseDown={(e) => { e.preventDefault(); choose(h); }} onMouseEnter={() => setActive(i)}>
                <span className="combo-name">{h.name}{h.oah ? <span className="pill ok" style={{ marginLeft: 8 }}>OneAquaHealth</span> : null}</span>
                <span className="combo-sub">{[h.region, h.country].filter(Boolean).join(", ")}</span>
              </li>
            )) : <li className="combo-empty" role="option" aria-selected={false} aria-disabled>{busy ? "…" : t("city.none")}</li>}
          </ul>
        ) : null}
      </div>
      {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
      <CityStatus city={picked && picked.city === value ? picked : null} />
    </div>
  );
}
