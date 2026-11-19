"use client";
import { equipmentImage } from "@/lib/equipment-image";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import type { Equipment } from "@/lib/types";
import { money } from "@/lib/types";
import { useSession } from "./session";
export function EquipmentCard({ item }: { item: Equipment }) {
  const { user } = useSession();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="equipment-card">
      <div className="equipment-image">
        {imageFailed ? (
          <div
            className="image-fallback"
            role="img"
            aria-label={"Image unavailable for " + item.name}
          >
            <span>Equipment image unavailable</span>
          </div>
        ) : (
          <Image
            unoptimized
            onError={() => setImageFailed(true)}
            src={equipmentImage(item)}
            alt={item.name}
            loading="lazy"
            width="600"
            height="440"
          />
        )}
        <span className="badge availability">
          {item.quantity > 0 ? "Available" : "Unavailable"}
        </span>
      </div>
      <div className="equipment-info">
        <p className="eyebrow">{item.category}</p>
        <h3>{item.name}</h3>
        <p className="location">
          <MapPin size={14} />
          {item.location}
        </p>
        <div className="card-bottom">
          <span>
            <strong>{money(item.price * 100)}</strong>
            <small>
              {" "}
              /{" "}
              {item.rentalType === "daily"
                ? "day"
                : item.rentalType === "weekly"
                  ? "week"
                  : "month"}
            </small>
          </span>
          <Link
            className="icon-link"
            aria-label={"View details for " + item.name}
            href={
              user
                ? "/equipment/" + item.id
                : "/login?returnTo=" +
                  encodeURIComponent("/equipment/" + item.id)
            }
          >
            <span>View details</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
