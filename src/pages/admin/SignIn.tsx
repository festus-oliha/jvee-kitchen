import { useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { Leaf, LogoMark } from "../../components/Icons";

/** Staff sign-in (design screen 9). */
export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-deep sm:items-center sm:justify-center sm:p-8">
      <Leaf className="pointer-events-none absolute -right-36 -top-36 h-[420px] w-[420px] opacity-15" />
      <div className="relative flex w-full flex-1 flex-col sm:max-w-md sm:flex-none sm:overflow-hidden sm:rounded-[28px] sm:shadow-2xl">
        <section className="flex flex-col gap-3.5 px-6 pb-9 pt-16 text-white sm:bg-deep sm:pt-10">
          <LogoMark size={64} />
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-1px]">Staff sign in</h1>
          <p className="text-[15px] leading-relaxed text-[#BDEBD3]">See new orders, update prices and manage both kitchens.</p>
        </section>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 rounded-t-[28px] bg-surface px-5 pb-6 pt-7 sm:rounded-none">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted">Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] outline-none focus:border-emerald" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted">Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] outline-none focus:border-emerald" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-[#FCE4E2] px-3.5 py-2.5 text-sm font-semibold text-[#7A1F17]">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-1 h-14 rounded-2xl text-base">{busy ? "Signing in…" : "Sign in"}</button>
          <p className="mt-auto rounded-[14px] bg-mint-light px-4 py-3.5 text-[13px] leading-relaxed text-muted">
            Only staff added by the founder can sign in. You stay signed in on this device until you sign out. Forgot your password? Ask the founder to send a reset link.
          </p>
        </form>
      </div>
    </div>
  );
}
