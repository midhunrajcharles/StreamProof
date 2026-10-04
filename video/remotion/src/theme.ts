import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

export const FPS = 30;
export const W = 1920;
export const H = 1080;

const inter = loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
const serif = loadSerif("normal", { weights: ["400"], subsets: ["latin"] });

export const font = {
  sans: inter.fontFamily,
  mono: mono.fontFamily,
  serif: serif.fontFamily,
};

/** Style A (explainer, from the Intatto reference) and style B (product, from the LangEase reference). */
export const c = {
  ink: "#0a0a0a",
  paper: "#ffffff",
  grey: "#6e6e73",
  hair: "#1d1d1f",
  faint: "rgba(0,0,0,0.08)",
  red: "#d70015",
  green: "#248a3d",
  blue: "#0066cc",
  blueGlow: "#2997ff",
  water: "#38bdf8",
  waterDeep: "#0b4a6f",
  // style B gradient
  skyTop: "#eef5ff",
  skyMid: "#dbe9ff",
  skyLow: "#f7fbff",
};

export const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};
