import { Link, NavLink, Outlet } from "react-router";
import { useMenu } from "../lib/menu";
import { hoursSummary } from "../lib/hours";
import { BagIcon, LogoMark, PinIcon } from "./Icons";

const ORDER_PHONE = "0805 892 3302";

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="JVee Crunch Kitchen, home">
      <LogoMark size={36} />
      <span className="flex flex-col leading-none">
        <span className="text-[21px] font-extrabold tracking-[-1px]">JVee</span>
        <span className="text-[11px] font-semibold text-emerald">crunch kitchen</span>
      </span>
    </Link>
  );
}

function Header() {
  const { location, menu, setLocationId } = useMenu();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-1 py-1 text-[15px] font-medium ${isActive ? "text-emerald" : "text-deep hover:text-emerald"}`;

  return (
    <header className="sticky top-0 z-30 border-b border-mint bg-white/95 backdrop-blur">
      <div className="page-x flex h-16 items-center gap-4 sm:h-[76px] sm:gap-8">
        <Brand />
        <nav className="hidden gap-6 md:flex" aria-label="Main">
          <NavLink to="/menu" className={navClass}>Menu</NavLink>
          <NavLink to="/basket" className={navClass}>Custom baskets</NavLink>
          <a href="#contact" className={navClass({ isActive: false })}>Contact</a>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {menu.locations.length > 1 && location && (
            <label className="relative flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-mint pl-3 pr-2 text-[13px] font-semibold sm:text-sm">
              <span className="text-emerald"><PinIcon /></span>
              <span className="sr-only">Ordering from</span>
              <select
                value={location.id}
                onChange={(e) => setLocationId(e.target.value)}
                className="appearance-none bg-transparent pr-4 font-semibold text-deep outline-none"
              >
                {menu.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </label>
          )}
          <Link to="/checkout" aria-label="Cart" className="flex h-11 w-11 items-center justify-center rounded-btn border-[1.5px] border-line text-deep hover:bg-mint-light">
            <BagIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { menu } = useMenu();
  const first = menu.locations[0];
  return (
    <footer id="contact" className="mt-16 bg-deep text-white">
      <div className="page-x grid gap-6 py-8 text-sm leading-relaxed sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[1px] text-zest">Call or WhatsApp</div>
          <div className="text-xl font-bold">{ORDER_PHONE}</div>
        </div>
        {menu.locations.map((l) => (
          <div key={l.id}>
            <div className="text-xs font-semibold uppercase tracking-[1px] text-zest">{l.name}</div>
            {l.address.replace(`, ${l.name}`, "")}
          </div>
        ))}
        {first && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-[1px] text-zest">Hours</div>
            {hoursSummary(first)}
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="page-x flex flex-wrap justify-between gap-2 py-4 text-xs text-[#BDEBD3]">
          <span>© {new Date().getFullYear()} JVee Crunch Kitchen · Delicious treats + clean nourishment</span>
          <span>Website by JVeesoft-IT Solutions and Services Ltd</span>
        </div>
      </div>
    </footer>
  );
}

export function DemoNotice() {
  const { source, error, retry } = useMenu();
  if (source === "demo")
    return (
      <div className="bg-amber-soft text-amber-ink">
        <p className="page-x py-2 text-[13px]">
          <strong>Preview data.</strong> The database is not connected yet, so this is the built-in copy of the menu. Add your Supabase settings to <code>.env</code> to use live data.
        </p>
      </div>
    );
  if (source === "error")
    return (
      <div className="bg-[#FCE4E2] text-[#7A1F17]">
        <div className="page-x flex flex-wrap items-center gap-3 py-2 text-[13px]">
          <span><strong>The menu could not load.</strong> Check your internet connection. ({error})</span>
          <button onClick={retry} className="font-semibold underline">Try again</button>
        </div>
      </div>
    );
  return null;
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <Header />
      <DemoNotice />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
