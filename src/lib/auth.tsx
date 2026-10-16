import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface StaffMember {
  user_id: string;
  name: string;
  role: "founder" | "staff";
  location_id: string | null; // null = both locations
}

interface AuthState {
  /** "loading" while checking, "signed-out", "no-access" (signed in but not on the staff list), "ready" */
  state: "loading" | "signed-out" | "no-access" | "ready";
  session: Session | null;
  staff: StaffMember | null;
  isFounder: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [state, setState] = useState<AuthState["state"]>("loading");

  const loadStaff = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s || !supabase) { setStaff(null); setState("signed-out"); return; }
    const { data } = await supabase.from("staff").select("user_id, name, role, location_id").eq("user_id", s.user.id).maybeSingle();
    setStaff((data as StaffMember | null) ?? null);
    setState(data ? "ready" : "no-access");
  }, []);

  useEffect(() => {
    if (!supabase) { setState("signed-out"); return; }
    supabase.auth.getSession().then(({ data }) => loadStaff(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") loadStaff(s);
      else if (s) setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadStaff]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "The database is not connected. Add your Supabase settings to .env first.";
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return null;
    if (/invalid login credentials/i.test(error.message)) return "That email and password don't match. Check them and try again.";
    if (/email not confirmed/i.test(error.message)) return "This account isn't confirmed yet. In Supabase, open Authentication > Users and confirm it.";
    if (/fetch/i.test(error.message)) return "Couldn't reach the server. Check your internet connection.";
    return error.message;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null); setStaff(null); setState("signed-out");
  }, []);

  const value = useMemo<AuthState>(
    () => ({ state, session, staff, isFounder: staff?.role === "founder", signIn, signOut }),
    [state, session, staff, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
