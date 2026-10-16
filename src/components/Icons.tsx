// Brand mark and product illustrations, drawn to match the design mockups.
// Product photos replace the illustrations when photo_url is set.

export function LogoMark({ size = 34, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="26" fill={inverted ? "#FFFFFF" : "#0B8F5A"} />
      <path d="M58,40 L58,64 Q58,80 42,80 Q32,80 27,72" stroke={inverted ? "#0B8F5A" : "#FFFFFF"} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M58,40 C55,24 66,14 84,14 C84,31 74,41 58,40 Z" fill="#A6E22E" />
    </svg>
  );
}

export function Leaf({ className, color = "#A6E22E" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M58,40 C55,24 66,14 84,14 C84,31 74,41 58,40 Z" fill={color} />
    </svg>
  );
}

export const CATEGORY_TILE: Record<string, string> = {
  "chin-chin": "bg-tile-chinchin",
  "gift-packages": "bg-tile-gift",
  "veggie-trays": "bg-tile-veggie",
  "small-chops": "bg-tile-chops",
  cakes: "bg-tile-cake",
  drinks: "bg-tile-drink",
};

export function CategoryArt({ category, size = 44 }: { category: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true } as const;
  switch (category) {
    case "chin-chin":
      return (
        <svg {...common}>
          <rect x="20" y="10" width="24" height="7" rx="2" fill="#0B8F5A" />
          <rect x="16" y="17" width="32" height="38" rx="9" fill="#FFFFFF" />
          <rect x="22" y="28" width="8" height="8" rx="2" fill="#E0A23A" />
          <rect x="33" y="26" width="8" height="8" rx="2" fill="#C98A2E" />
          <rect x="27" y="38" width="8" height="8" rx="2" fill="#D9962B" />
          <rect x="37" y="40" width="7" height="7" rx="2" fill="#E0A23A" />
        </svg>
      );
    case "gift-packages":
      return (
        <svg {...common}>
          <rect x="12" y="28" width="40" height="26" rx="4" fill="#0B8F5A" />
          <rect x="10" y="20" width="44" height="10" rx="3" fill="#087A4C" />
          <rect x="29" y="20" width="6" height="34" fill="#A6E22E" />
          <path d="M32 20c-4-8-14-8-12-2 1 3 8 2 12 2zm0 0c4-8 14-8 12-2-1 3-8 2-12 2z" fill="#A6E22E" />
        </svg>
      );
    case "veggie-trays":
      return (
        <svg {...common}>
          <rect x="8" y="20" width="48" height="30" rx="8" fill="#FFFFFF" />
          <circle cx="22" cy="31" r="7" fill="#7CB82F" />
          <circle cx="36" cy="30" r="6" fill="#F28C28" />
          <circle cx="46" cy="38" r="5" fill="#F5D33A" />
          <circle cx="28" cy="41" r="5" fill="#3FA34D" />
        </svg>
      );
    case "small-chops":
      return (
        <svg {...common}>
          <path d="M10 46 L26 18 L42 46 Z" fill="#D9962B" />
          <path d="M28 46 L42 24 L54 46 Z" fill="#E8B04A" />
          <circle cx="48" cy="20" r="7" fill="#B8761C" />
        </svg>
      );
    case "cakes":
      return (
        <svg {...common}>
          <rect x="12" y="30" width="40" height="22" rx="5" fill="#FFFFFF" />
          <rect x="12" y="39" width="40" height="4" fill="#F2B8C6" />
          <circle cx="22" cy="27" r="4.5" fill="#C2335C" />
          <circle cx="32" cy="25" r="4.5" fill="#7CB82F" />
          <circle cx="42" cy="27" r="4.5" fill="#F28C28" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="27" y="6" width="10" height="7" rx="2" fill="#0B8F5A" />
          <path d="M26 13h12l3 9v30a4 4 0 0 1-4 4h-10a4 4 0 0 1-4-4V22z" fill="#9FD7E8" />
          <rect x="23" y="30" width="18" height="14" fill="#053B2A" />
        </svg>
      );
  }
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const BagIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
export const PinIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
export const ClockIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);
export const CheckCircle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#0B8F5A" />
    <path d="M7 12.5l3 3 7-7" stroke="#FFFFFF" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChatIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);
