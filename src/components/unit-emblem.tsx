import Image from "next/image";
import type { UnitTheme } from "@/lib/units";

export function UnitEmblem({
  theme,
  className = "",
  size = 220,
}: {
  theme: UnitTheme;
  className?: string;
  size?: number;
}) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.palette.accent}66, transparent 65%)`,
        }}
      />
      <div
        className="relative grid h-full w-full place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), rgba(0,0,0,0.18) 70%)`,
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 30px 60px -30px rgba(0,0,0,0.6)",
        }}
      >
        <Image
          alt={`${theme.hebrewName} תג יחידה`}
          className="relative z-10 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
          height={size}
          src={theme.assetPath}
          style={{ maxHeight: "78%", maxWidth: "78%", height: "auto", width: "auto" }}
          width={size}
        />
      </div>
    </div>
  );
}
