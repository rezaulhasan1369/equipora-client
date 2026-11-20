"use client";
import Image from "next/image";
import { useState } from "react";
import type { Equipment } from "@/lib/types";
import { equipmentImage } from "@/lib/equipment-image";
function Visual({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div
      className={`image-fallback ${className ?? ""}`}
      role="img"
      aria-label={`Image unavailable for ${name}`}
    >
      <span>Equipment image unavailable</span>
    </div>
  ) : (
    <Image
      unoptimized
      src={src}
      alt={name}
      width={1000}
      height={800}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
export function EquipmentVisual({
  item,
  className,
}: {
  item: Equipment;
  className?: string;
}) {
  const src = equipmentImage(item);
  return <Visual key={src} src={src} name={item.name} className={className} />;
}
