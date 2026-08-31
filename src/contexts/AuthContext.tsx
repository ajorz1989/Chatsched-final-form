import { createContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface SignUpMeta {
  full_name: string;
  company_name?: string;
  phone?: string;
  role?: "business" | "publisher";
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  // Authenticator Assurance Level — Supabase's MFA status for the current
  // session. current === next means no MFA is pending (either the account
  // has no factor enrolled, or it's already been verified this session).
  // current !== next means a verified factor exists but this session
  // hasn't cleared the challenge yet. See RequireAuth.tsx for how this
  // gates /admin, and MfaSetup.tsx / MfaVerify.tsx for the two states.
  aal: { current: string | null; next: string | null };
  refreshAal: () => Promise<void>;
  signUp: (email: string, password: string, meta: SignUpMeta) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<{ current: string | null; next: string | null }>({ current: null, next: null });

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile) ?? null);
    // Last-active heartbeat (Phase 31) — only meaningful for publishers,
    // and throttled server-side inside the function itself, so calling it
    // on every session start/token refresh is cheap and safe.
    if ((data as Profile | null)?.role === "publisher") {
      supabase.rpc("touch_publisher_activity").then(({ error }) => { if (error) { /* non-critical, ignore */ } });
    }
  }

  async function refreshAal() {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return;
    setAal({ current: data.currentLevel, next: data.nextLevel });
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        refreshAal();
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        refreshAal();
      } else {
        setProfile(null);
        setAal({ current: null, next: null });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, meta: SignUpMeta) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  // Requires the Google provider to be turned on in the Supabase dashboard
  // (Authentication → Providers → Google, with your own Google Cloud OAuth
  // client ID/secret) — that part can't be done from code. Once enabled,
  // this just redirects into Supabase's hosted OAuth flow and back.
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Sends the "reset your password" email. Supabase's link redirects back
  // here with a recovery session already active (detectSessionInUrl is on
  // by default) — ResetPassword.tsx picks that up and lets them set a new
  // password. Always redirects to /reset-password regardless of where the
  // request came from, since that's the only page that handles the recovery
  // session.
  async function resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }

  // Called from ResetPassword.tsx once the recovery-link session is active.
  // Updating the password on that session also completes the sign-in — no
  // separate signIn call needed afterward.
  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, aal, refreshAal, signUp, signIn, signInWithGoogle, resetPasswordForEmail, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
