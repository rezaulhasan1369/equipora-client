import type { Equipment } from "./types";
export function equipmentImage(item: Equipment) {
  return item.demoOnly &&
    item.demoImageSource === item.image &&
    item.demoId &&
    item.demoId.length === 7 &&
    /^EQD-\d{3}$/.test(item.demoId)
    ? "/assets/equipment/" + item.demoId.toLowerCase() + ".webp"
    : item.image;
}
