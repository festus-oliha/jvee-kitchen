import { Link } from "react-router";
import { useCart } from "../lib/cart";
import { naira } from "../lib/money";

/** Sticky "View cart" bar shown on the menu once the cart has something in it. */
export default function CartBar() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <Link
        to="/checkout"
        className="mx-auto flex h-14 max-w-page items-center justify-between rounded-2xl bg-deep px-[18px] font-bold text-white hover:bg-[#0a4a35] sm:max-w-md"
      >
        <span className="flex items-center gap-2.5 text-[15px]">
          <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-lg bg-zest px-1.5 text-[13px] text-deep">{count}</span>
          View cart
        </span>
        <span className="text-base tabular-nums">{naira(subtotal)}</span>
      </Link>
    </div>
  );
}
