"use client";
// Offline outbox: a report made without signal is kept in IndexedDB (photo included)
// and sent when the device is back online. Nothing leaves the device until then.
import { api, type Report } from "./api";

export type Draft = {
  key: string; saved_at: string; lat: number; lon: number; accuracy: string; codes: string[];
  description: string; contact: string; mission_id: string; photo?: Blob; photo_name?: string;
  error?: string; // set when the server refused it; shown to the person, not retried
};

const DB = "streamproof";
const STORE = "outbox";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const saveDraft = (d: Draft) => tx("readwrite", (s) => s.put(d));
export const listDrafts = () => tx<Draft[]>("readonly", (s) => s.getAll() as IDBRequest<Draft[]>).catch(() => [] as Draft[]);
export const removeDraft = (key: string) => tx("readwrite", (s) => s.delete(key));

export function formOf(d: Draft) {
  return {
    lat: String(d.lat), lon: String(d.lon), accuracy: d.accuracy, codes: d.codes, description: d.description,
    contact: d.contact, mission_id: d.mission_id,
    photo: d.photo ? new File([d.photo], d.photo_name || "photo.jpg", { type: d.photo.type || "image/jpeg" }) : undefined,
  };
}

let flushing = false;

/** Send every saved draft. Returns the reports that were accepted. */
export async function flush(): Promise<Report[]> {
  if (flushing || typeof indexedDB === "undefined" || !navigator.onLine) return [];
  flushing = true;
  const sent: Report[] = [];
  try {
    for (const d of await listDrafts()) {
      if (d.error) continue;
      try {
        sent.push(await api<Report>("/reports", { form: formOf(d) }));
        await removeDraft(d.key);
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (!err.status || err.status === 401) break; // still offline, or needs sign-in: keep for later
        await saveDraft({ ...d, error: err.message || "The server refused this report." });
      }
    }
    window.dispatchEvent(new Event("outbox-change"));
  } finally {
    flushing = false;
  }
  return sent;
}
