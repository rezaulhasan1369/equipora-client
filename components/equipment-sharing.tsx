"use client";
import { useRef, useState } from "react";
import { Share2, Copy } from "lucide-react";
import { equipmentLink } from "@/lib/discovery-policy.mjs";
import type { Equipment } from "@/lib/types";
export function EquipmentSharing({ item }: { item: Equipment }) {
  const [message, setMessage] = useState(""),
    [manual, setManual] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function copy() {
    const url = equipmentLink(window.location.origin, item.id);
    try {
      await navigator.clipboard.writeText(url);
      setManual("");
      setMessage("Equipment link copied.");
    } catch {
      setManual(url);
      setMessage("Clipboard unavailable. Select and copy the link below.");
      requestAnimationFrame(() => {
        input.current?.focus();
        input.current?.select();
      });
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: item.name,
        text: `Explore ${item.name} on Equipora`,
        url: equipmentLink(window.location.origin, item.id),
      });
      setMessage("Equipment shared.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        setMessage("Sharing canceled.");
      else await copy();
    }
  }
  return (
    <div className="equipment-sharing">
      <div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={share}
        >
          <Share2 size={16} aria-hidden="true" /> Share equipment
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          <Copy size={16} aria-hidden="true" /> Copy link
        </button>
      </div>
      <p role="status" className="small-print">
        {message}
      </p>
      {manual && (
        <label>
          Equipment link
          <input ref={input} className="input" readOnly value={manual} />
        </label>
      )}
    </div>
  );
}
