// Initials on a colour the person chose. No photos: nothing identifying is uploaded.
import type { Avatar as AvatarColour } from "./api";

export function initials(name: string) {
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({ name, colour = "water", size = 40 }: { name: string; colour?: AvatarColour; size?: number }) {
  return (
    <span className="avatar" data-c={colour} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
    </span>
  );
}
