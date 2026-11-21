// Friendly first name for greetings. Skips leading honorifics/abbreviations that are common in
// registered names (e.g. "Md. Rezaul Hasan" -> "Rezaul") and strips trailing punctuation so the
// greeting never shows "Md." or a doubled full stop. Falls back to the whole trimmed name.
const PREFIXES = new Set(["md", "mohd", "mr", "mrs", "ms", "miss", "dr", "engr", "prof"]);

export function greetingName(name: string | null | undefined): string {
  const tokens = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = tokens.find((t) => !PREFIXES.has(t.replace(/\.+$/, "").toLowerCase()));
  const chosen = (first ?? tokens.join(" ")).replace(/[.,;:!?]+$/, "");
  return chosen || "there";
}
