export function cleanIds(input, limit) {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .filter((id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id))
        .map((id) => id.toLowerCase()),
    ),
  ].slice(0, limit);
}
export function restoredIds(raw, limit) {
  if (typeof raw !== "string" || raw.length > 4096) return [];
  try {
    return cleanIds(JSON.parse(raw), limit);
  } catch {
    return [];
  }
}
export function recentIds(previous, id) {
  return cleanIds([id, ...previous.filter((value) => value !== id)], 8);
}
