import { Suspense, useEffect, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router";
import { AuthProvider, useAuth } from "../../lib/auth";
import { configProblem, isSupabaseConfigured } from "../../lib/supabase";
import { LogoMark } from "../../components/Icons";
import SignIn from "./SignIn";

/** /admin: checks who is signed in, then shows the admin frame around the page. */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { state, staff, isFounder, signOut } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = "Staff admin · JVee Crunch Kitchen";
    return () => { document.title = "JVee Crunch Kitchen"; };
  }, []);

  if (!isSupabaseConfigured || configProblem) {
    return (
      <Message title="The database isn't connected">
        {configProblem ?? "The admin needs Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart npm run dev."}
      </Message>
    );
  }
  if (state === "loading") return <Message title="Checking your sign-in…" />;
  if (state === "signed-out") return <SignIn />;
  if (state === "no-access" || !staff) {
    return (
      <Message title="This account isn't on the staff list">
        You signed in, but the founder hasn't given this account access yet. Ask her to add you in Settings, then sign in again.
        <button type="button" onClick={signOut} className="btn-secondary mt-5 w-full">Sign out</button>
      </Message>
    );
  }
  // Staff who aren't the founder only see orders
  if (!isFounder && pathname.replace(/\/$/, "") !== "/admin") return <Navigate to="/admin" replace />;

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors ${isActive ? "bg-zest text-deep" : "text-[#BDEBD3] hover:bg-white/10 hover:text-white"}`;

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-30 bg-deep text-white shadow-md">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2.5" aria-label="Orders">
            <LogoMark size={36} />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold">JVee admin</span>
              <span className="block text-xs text-[#BDEBD3]">{staff.name} · {isFounder ? "Founder" : "Staff"}</span>
            </span>
          </Link>
          <nav aria-label="Admin" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:ml-6 sm:w-auto">
            <NavLink to="/admin" end className={tab}>Orders</NavLink>
            {isFounder && <NavLink to="/admin/products" className={tab}>Products</NavLink>}
            {isFounder && <NavLink to="/admin/settings" className={tab}>Settings</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="hidden h-10 items-center rounded-xl px-3 text-sm font-semibold text-[#BDEBD3] hover:text-white md:flex">View website</Link>
            <button type="button" onClick={signOut} className="h-10 rounded-xl border border-white/25 px-3.5 text-sm font-semibold hover:bg-white/10">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-5 sm:px-6">
        <Suspense fallback={<p className="py-10 text-center text-muted">Loading…</p>}><Outlet /></Suspense>
      </main>
    </div>
  );
}

function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-md rounded-[20px] border border-line bg-surface p-6 text-center">
        <div className="mx-auto mb-4 w-fit"><LogoMark size={48} /></div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {children && <div className="mt-2 text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}
