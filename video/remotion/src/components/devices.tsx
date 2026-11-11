/**
 * Product-photography device frames for the "one app, every screen" scene (clean, Apple-store style).
 * Each frame is drawn in CSS from the size of its SCREEN: titanium / aluminium rims, black glass bezels, side buttons,
 * a hinge on the dual-screen, a stand on the display, and a soft diagonal reflection on the glass. Children fill the
 * screen exactly (same aspect ratio as the recording), so the footage is never cropped or stretched.
 */
import React from "react";

const METAL = "linear-gradient(135deg, #ececf0 0%, #a3a3a9 16%, #f6f6f9 36%, #8e8e94 58%, #e2e2e7 80%, #b0b0b6 100%)";
const METAL_DARK = "linear-gradient(135deg, #6b6c72 0%, #2b2c30 30%, #8a8b91 52%, #2b2c30 76%, #5a5b61 100%)";
const BEZEL = "#060607";

const Glass: React.FC<{ sheen: number; radius: number }> = ({ sheen, radius }) => (
  <div style={{ position: "absolute", inset: 0, borderRadius: radius, pointerEvents: "none",
    background: `linear-gradient(115deg, rgba(255,255,255,0) ${18 + sheen * 55}%, rgba(255,255,255,0.13) ${32 + sheen * 55}%, rgba(255,255,255,0) ${46 + sheen * 55}%),
      linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 22%)`,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
);

/** A button on the side rail of a phone or tablet. */
const SideButton: React.FC<{ side: "l" | "r" | "t"; at: number; len: number; thick: number; total: number }> = ({ side, at, len, thick, total }) => (
  <div style={{ position: "absolute", background: METAL_DARK, borderRadius: thick,
    ...(side === "t" ? { top: -thick * 0.7, left: at, width: len, height: thick } : { top: at, height: len, width: thick, [side === "l" ? "left" : "right"]: -thick * 0.7 }),
    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.35)", opacity: total }} />
);

/** Soft contact shadow where a device touches the surface. */
export const Contact: React.FC<{ width: number; opacity?: number }> = ({ width, opacity = 1 }) => (
  <div style={{ position: "absolute", left: "50%", bottom: -width * 0.035, width: width * 1.18, height: width * 0.09, transform: "translateX(-50%)",
    background: "radial-gradient(ellipse at center, rgba(20,24,40,0.30) 0%, rgba(20,24,40,0.12) 40%, rgba(20,24,40,0) 70%)", filter: "blur(6px)", opacity }} />
);

// ---------------------------------------------------------------- phone (390 x 844 screen)
export const phoneSize = (h: number) => {
  const sw = (h * 390) / 844;
  const edge = sw * 0.06;
  return { sw, w: sw + edge * 2, h: h + edge * 2 };
};
export const PhonePro: React.FC<{ h: number; children: React.ReactNode; sheen?: number }> = ({ h, children, sheen = 0 }) => {
  const { sw, w, h: H } = phoneSize(h);
  const rim = sw * 0.028, bez = sw * 0.032, rs = sw * 0.15, rb = rs + bez, ro = rb + rim;
  return (
    <div style={{ position: "relative", width: w, height: H }}>
      <SideButton side="l" at={H * 0.14} len={H * 0.035} thick={sw * 0.012} total={1} />
      <SideButton side="l" at={H * 0.2} len={H * 0.075} thick={sw * 0.012} total={1} />
      <SideButton side="l" at={H * 0.29} len={H * 0.075} thick={sw * 0.012} total={1} />
      <SideButton side="r" at={H * 0.23} len={H * 0.11} thick={sw * 0.012} total={1} />
      <div style={{ position: "absolute", inset: 0, borderRadius: ro, background: METAL,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.7), inset 0 0 0 3px rgba(0,0,0,0.28), 0 60px 90px -30px rgba(10,20,50,0.38), 0 22px 36px -12px rgba(10,20,50,0.26)" }} />
      <div style={{ position: "absolute", inset: rim, borderRadius: rb, background: BEZEL, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", inset: rim + bez, borderRadius: rs, overflow: "hidden", background: "#fff" }}>
        {children}
        <div style={{ position: "absolute", top: sw * 0.026, left: "50%", width: sw * 0.3, height: sw * 0.088, transform: "translateX(-50%)", borderRadius: 999, background: "#000",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}>
          <div style={{ position: "absolute", right: sw * 0.035, top: "50%", width: sw * 0.034, height: sw * 0.034, marginTop: -sw * 0.017, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #2a3350, #0a0b12 70%)" }} />
        </div>
        <Glass sheen={sheen} radius={rs} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- tablet (820 x 1180 screen)
export const tabletSize = (h: number) => {
  const sw = (h * 820) / 1180;
  const edge = sw * 0.045;
  return { sw, w: sw + edge * 2, h: h + edge * 2 };
};
export const Tablet: React.FC<{ h: number; children: React.ReactNode; sheen?: number }> = ({ h, children, sheen = 0 }) => {
  const { sw, w, h: H } = tabletSize(h);
  const rim = sw * 0.012, bez = sw * 0.033, rs = sw * 0.04, rb = rs + bez, ro = rb + rim;
  return (
    <div style={{ position: "relative", width: w, height: H }}>
      <SideButton side="t" at={w * 0.8} len={w * 0.06} thick={sw * 0.01} total={1} />
      <SideButton side="r" at={H * 0.12} len={H * 0.05} thick={sw * 0.01} total={0} />
      <div style={{ position: "absolute", inset: 0, borderRadius: ro, background: METAL,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.7), inset 0 0 0 3px rgba(0,0,0,0.25), 0 60px 90px -30px rgba(10,20,50,0.36), 0 22px 36px -12px rgba(10,20,50,0.24)" }} />
      <div style={{ position: "absolute", inset: rim, borderRadius: rb, background: BEZEL, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", top: rim + bez * 0.5 - sw * 0.0055, left: "50%", width: sw * 0.011, height: sw * 0.011, marginLeft: -sw * 0.0055, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #2a3350, #0a0b12 70%)" }} />
      <div style={{ position: "absolute", inset: rim + bez, borderRadius: rs, overflow: "hidden", background: "#fff" }}>
        {children}
        <Glass sheen={sheen} radius={rs} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- dual-screen (two 540 px screens + a 34 px hinge = 1114 x 705)
export const duoSize = (w: number) => {
  const sh = (w * 705) / 1114;
  const edge = w * 0.02;
  return { sh, w: w + edge * 2, h: sh + edge * 2, hinge: (w * 34) / 1114 };
};
export const DualScreen: React.FC<{ w: number; children: React.ReactNode; sheen?: number }> = ({ w, children, sheen = 0 }) => {
  const { sh, w: W, h: H, hinge } = duoSize(w);
  const rim = w * 0.007, bez = w * 0.011, rs = w * 0.014, rb = rs + bez, ro = rb + rim;
  const stripW = hinge + bez * 2;
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: ro, background: METAL,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.7), inset 0 0 0 3px rgba(0,0,0,0.25), 0 60px 90px -30px rgba(10,20,50,0.36), 0 22px 36px -12px rgba(10,20,50,0.24)" }} />
      <div style={{ position: "absolute", inset: rim, borderRadius: rb, background: BEZEL, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", inset: rim + bez, borderRadius: rs, overflow: "hidden", background: "#fff" }}>
        {children}
        {/* crease shading on both screens next to the hinge */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: w * 0.06, transform: "translateX(-50%)",
          background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.10) 42%, rgba(0,0,0,0.10) 58%, rgba(0,0,0,0) 100%)" }} />
        <Glass sheen={sheen} radius={rs} />
      </div>
      {/* the hinge: bezel · metal barrel · bezel, standing proud of the top and bottom edges */}
      <div style={{ position: "absolute", top: -w * 0.004, bottom: -w * 0.004, left: "50%", width: stripW, transform: "translateX(-50%)", display: "flex",
        borderRadius: w * 0.004, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.28)" }}>
        <div style={{ flex: bez, background: BEZEL }} />
        <div style={{ flex: hinge, background: "linear-gradient(90deg, #3d3e43 0%, #b9bac0 30%, #f1f1f4 50%, #9b9ca2 72%, #3d3e43 100%)" }} />
        <div style={{ flex: bez, background: BEZEL }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- desktop display (1440 x 900 screen) with a stand
export const displaySize = (w: number) => {
  const sh = (w * 900) / 1440;
  const edge = w * 0.018;
  const frameH = sh + edge * 2 + w * 0.014;
  const neckH = w * 0.15, footH = w * 0.016;
  return { sh, w: w + edge * 2, frameH, h: frameH + neckH * 0.92 + footH };
};
export const Display: React.FC<{ w: number; children: React.ReactNode; sheen?: number }> = ({ w, children, sheen = 0 }) => {
  const { sh, w: W, frameH, h: H } = displaySize(w);
  const rim = w * 0.004, bez = w * 0.013, rs = w * 0.005, rb = rs + bez, ro = rb + rim;
  const neckH = w * 0.15, footH = w * 0.016;
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      {/* stand */}
      <div style={{ position: "absolute", left: "50%", top: frameH - neckH * 0.08, width: w * 0.14, height: neckH, transform: "translateX(-50%)",
        clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)", background: "linear-gradient(90deg, #a9a9af 0%, #f4f4f7 30%, #d4d4d9 60%, #8f8f95 100%)" }} />
      <div style={{ position: "absolute", left: "50%", bottom: 0, width: w * 0.3, height: footH, transform: "translateX(-50%)", borderRadius: `${footH}px ${footH}px ${footH * 0.4}px ${footH * 0.4}px`,
        background: "linear-gradient(180deg, #f4f4f7 0%, #b4b4ba 55%, #8d8d93 100%)", boxShadow: "0 3px 6px rgba(0,0,0,0.22)" }} />
      {/* panel */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: frameH, borderRadius: ro, background: METAL,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.7), inset 0 0 0 3px rgba(0,0,0,0.22), 0 50px 80px -30px rgba(10,20,50,0.32), 0 18px 30px -12px rgba(10,20,50,0.22)" }}>
        <div style={{ position: "absolute", left: rim, right: rim, top: rim, bottom: rim, borderRadius: rb, background: BEZEL, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", top: rim + bez * 0.5 - w * 0.0025, left: "50%", width: w * 0.005, height: w * 0.005, marginLeft: -w * 0.0025, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #2a3350, #0a0b12 70%)" }} />
        <div style={{ position: "absolute", left: rim + bez, top: rim + bez, width: w, height: sh, borderRadius: rs, overflow: "hidden", background: "#fff" }}>
          {children}
          <Glass sheen={sheen} radius={rs} />
        </div>
      </div>
    </div>
  );
};

/** Touch feedback for the touch devices: a soft ring that opens where the finger lands. */
export const Taps: React.FC<{ taps: { t: number; x: number; y: number }[]; t: number; size?: number }> = ({ taps, t, size = 64 }) => (
  <>
    {taps.map((k, i) => {
      const d = t - k.t;
      if (d < -0.06 || d > 0.7) return null;
      const press = d < 0 ? 1 + d / 0.06 : 1;
      const grow = Math.max(0, d) / 0.7;
      return (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: k.x - size * 0.3, top: k.y - size * 0.3, width: size * 0.6, height: size * 0.6, borderRadius: "50%",
            background: "rgba(20,30,60,0.22)", boxShadow: "0 0 0 2px rgba(255,255,255,0.65)", opacity: press * (1 - grow * 0.9) }} />
          <div style={{ position: "absolute", left: k.x - size / 2, top: k.y - size / 2, width: size, height: size, borderRadius: "50%",
            border: "2.5px solid rgba(0,102,204,0.55)", transform: `scale(${0.4 + grow * 1.1})`, opacity: Math.max(0, 1 - grow) * press }} />
        </React.Fragment>
      );
    })}
  </>
);
