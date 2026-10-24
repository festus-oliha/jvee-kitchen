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
  proteins: "bg-tile-protein",
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
    case "proteins":
      return (
        <svg {...common}>
          <path d="M40 10c8 0 14 6 14 14 0 9-8 15-16 15-3 0-5 1-7 3l-6 6a5 5 0 1 1-7 7 5 5 0 1 1-6-7l6-6c2-2 3-4 3-7 0-8 6-25 25-25z" fill="#C98A2E" />
          <path d="M44 16c4 1 6 4 6 8" stroke="#F2C27A" strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="30" y="34" width="10" height="5" rx="2" transform="rotate(-45 35 36)" fill="#E0A23A" />
          <path d="M14 46l4 4" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="40" r="3" fill="#C2362B" /><circle cx="52" cy="34" r="2.5" fill="#E8C33A" />
        </svg>
      );
    default:
      // Any category added from the admin: a covered serving dish
      return (
        <svg {...common}>
          <path d="M10 44a22 22 0 0 1 44 0z" fill="#0B8F5A" />
          <path d="M18 40a14 14 0 0 1 10-12" stroke="#A6E22E" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="19" r="3.5" fill="#053B2A" />
          <rect x="6" y="44" width="52" height="6" rx="3" fill="#053B2A" />
        </svg>
      );
    case "drinks":
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
