import { Inter, Space_Grotesk, Xanh_Mono } from "next/font/google";

// Open-licence fonts (SIL OFL), self-hosted by next/font at build time.
export const text = Inter({ subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"], variable: "--sp-text", display: "swap" });
export const mono = Xanh_Mono({ subsets: ["latin", "latin-ext", "vietnamese"], weight: "400", variable: "--sp-mono", display: "swap" });
export const display = Space_Grotesk({ subsets: ["latin", "latin-ext", "vietnamese"], weight: "500", variable: "--sp-display", display: "swap" });

export const fontVars = `${text.variable} ${mono.variable} ${display.variable}`;
