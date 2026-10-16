import { useMenu } from "../lib/menu";
import { isOpenNow, nextOpening } from "../lib/hours";
import { ClockIcon } from "./Icons";

/** Closed-for-orders banner (design screen 12) and the out-of-hours note (rule R1). */
export default function LocationNotice() {
  const { location, menu, setLocationId } = useMenu();
  if (!location) return null;

  if (!location.taking_orders) {
    const other = menu.locations.find((l) => l.id !== location.id && l.taking_orders);
    return (
      <section role="status" className="flex flex-col gap-2.5 rounded-[18px] bg-amber-soft p-4 text-amber-ink">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-none text-[#8A5300]"><ClockIcon /></span>
          <div>
            <p className="font-bold">{location.name} is not taking orders today</p>
            <p className="text-[13px] leading-snug">You can still browse. Ordering opens again at {nextOpening(location)}.</p>
          </div>
        </div>
        {other && (
          <button onClick={() => setLocationId(other.id)} className="h-11 rounded-xl border-[1.5px] border-[#8A5300] text-sm font-bold hover:bg-white/50">
            Order from {other.name} instead
          </button>
        )}
      </section>
    );
  }

  if (!isOpenNow(location)) {
    return (
      <p className="rounded-xl bg-mint-light px-4 py-2.5 text-[13px] text-muted">
        We're closed right now. You can still order: we start making it at {nextOpening(location)}.
      </p>
    );
  }
  return null;
}
