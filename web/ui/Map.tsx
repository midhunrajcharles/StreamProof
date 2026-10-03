"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api, type Meta } from "./api";

// Leaflet touches `window`, so the map only renders in the browser.
export const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map skeleton" aria-busy="true" aria-label="Loading map" />,
});

let metaCache: Promise<Meta> | null = null;

/** Reference data (signs, trust levels, streams, rules). Loaded once per page load. */
export function useMeta() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    metaCache ??= api<Meta>("/meta").catch((e) => { metaCache = null; throw e; });
    metaCache.then(setMeta).catch(() => {});
  }, []);
  return meta;
}
