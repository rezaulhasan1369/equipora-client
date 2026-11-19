import Image from "next/image";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="equipora-brand">
      <Image
        src={
          light
            ? "/assets/branding/equipora-symbol-white-128.png"
            : "/assets/branding/equipora-symbol-slate-128.png"
        }
        alt=""
        width={44}
        height={44}
        priority
      />
      <span className="brand-wordmark">
        Equipora
        <span className="brand-descriptor" aria-hidden="true">
          EQUIPMENT. POSSIBILITIES.
        </span>
      </span>
    </span>
  );
}
