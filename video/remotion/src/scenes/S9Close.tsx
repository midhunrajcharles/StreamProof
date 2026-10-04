/** Scene 9 · Close (style B → light). Evidence particles stream through a slowly turning 3D network, then converge
 * onto the letters of the wordmark, which resolves into crisp type; the tagline and an honest footer follow. */
import React, { useMemo, useRef, useEffect } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky, clamp, useSec } from "../components/kit";
import { c, ease, font, W, H } from "../theme";
import { scene } from "../timing";

const S = scene(9);
const N = 2200;

/** Sample target points from the rendered wordmark. */
function wordTargets(): [number, number][] {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.font = `200px ${font.serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("StreamProof", W / 2, H / 2 - 40);
  const img = ctx.getImageData(0, 0, W, H).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (img[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) out.push(pts[Math.floor(random(`t${i}`) * pts.length)] ?? [W / 2, H / 2]);
  return out;
}

export const S9Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const targets = useMemo(wordTargets, []);
  const nodes = useMemo(() => Array.from({ length: 26 }, (_, i) => [
    (random(`nx${i}`) - 0.5) * 1700, (random(`ny${i}`) - 0.5) * 820, (random(`nz${i}`) - 0.5) * 900] as [number, number, number]), []);
  const converge = ease.inOut(interpolate(t, [0.6, 3.4], [0, 1], clamp));
  const crisp = interpolate(t, [3.1, 3.9], [0, 1], clamp);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const rot = t * 0.25;
    const proj = (p: [number, number, number]) => {
      const x = p[0] * Math.cos(rot) - p[2] * Math.sin(rot);
      const z = p[0] * Math.sin(rot) + p[2] * Math.cos(rot) + 1400;
      const k = 1200 / z;
      return [W / 2 + x * k, H / 2 + p[1] * k, k] as const;
    };
    // network edges, fading as the word forms
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      if (random(`e${i}-${j}`) > 0.16) continue;
      const a = proj(nodes[i]);
      const b = proj(nodes[j]);
      ctx.strokeStyle = `rgba(0,102,204,${0.22 * (1 - converge)})`;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      // each particle travels along an edge of the network, then flies to its letter
      const a = nodes[Math.floor(random(`pa${i}`) * nodes.length)];
      const b = nodes[Math.floor(random(`pb${i}`) * nodes.length)];
      const u = (t * (0.15 + random(`ps${i}`) * 0.25) + random(`po${i}`)) % 1;
      const p3: [number, number, number] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      const [px, py, k] = proj(p3);
      const delay = random(`pd${i}`) * 0.35;
      const m = ease.inOut(Math.min(1, Math.max(0, (converge - delay) / (1 - delay))));
      const x = px + (targets[i][0] - px) * m;
      const y = py + (targets[i][1] - py) * m;
      const r = (1.2 + 1.6 * k) * (1 - 0.4 * m);
      ctx.fillStyle = `rgba(${Math.round(0 + 10 * m)},${Math.round(102 - 92 * m)},${Math.round(204 - 194 * m)},${(0.85 - 0.5 * crisp)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [t, nodes, targets, converge, crisp]);
  const tag = interpolate(t, [S.lines[0].start + 0.6, S.lines[0].start + 1.4], [0, 1], clamp);
  const foot = interpolate(t, [S.lines[0].start + 2.0, S.lines[0].start + 2.8], [0, 1], clamp);
  const out = interpolate(t, [S.duration - 1.0, S.duration], [1, 0], clamp);
  return (
    <Sky>
      <AbsoluteFill style={{ opacity: out }}>
        <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - crisp }} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: font.serif, fontSize: 200, color: c.ink, letterSpacing: "-0.02em", marginTop: -80, opacity: crisp,
            filter: `blur(${(1 - crisp) * 8}px)` }}>StreamProof</div>
          <div style={{ fontFamily: font.sans, fontSize: 40, color: c.ink, opacity: tag, marginTop: 6, transform: `translateY(${(1 - tag) * 14}px)` }}>
            Evidence a city can act on.
          </div>
          <div style={{ position: "absolute", bottom: 90, fontFamily: font.mono, fontSize: 17, letterSpacing: "0.08em", color: c.grey,
            opacity: foot, textTransform: "uppercase", textAlign: "center", lineHeight: 1.9 }}>
            Open source · Built on the HL7 Europe OneAquaHealth FHIR guide · Demo data
            <br />
            Music: “Loyalty” by BreakzStudios (Pixabay) · Voice: Kokoro (open source)
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </Sky>
  );
};
