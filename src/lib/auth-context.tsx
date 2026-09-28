import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export const appRoles = [
  "ADMIN",
  "PI",
  "CRC",
  "SAFETY_OFFICER",
  "COMPLIANCE_OFFICER",
  "DATA_MANAGER",
] as const;

export type AppRole = (typeof appRoles)[number];

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: Error | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string, requestedRole?: AppRole) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at, updated_at")
      .eq("id", userData.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        setProfileError(null);
        setProfile(null);
        return;
      }
      setProfileError(error);
      throw error;
    }

    setProfileError(null);
    setProfile(data as Profile);
  };

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed to restore Supabase session:", error);
      }
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        try {
          await refreshProfile();
        } catch (profileError) {
          console.error("Failed to load profile:", profileError);
        }
      }
      if (active) setLoading(false);
    };

    void loadSession();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT" || !nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      void refreshProfile().catch((error) => {
        console.error("Failed to load profile after auth change:", error);
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, requestedRole?: AppRole) => {
    const { data: sessionData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (requestedRole) {
      const { data: assignedProfile, error: profileQueryError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.user.id)
        .single();
      if (profileQueryError) {
        await supabase.auth.signOut();
        throw profileQueryError;
      }
      if (assignedProfile.role !== requestedRole) {
        await supabase.auth.signOut();
        throw new Error(`This account is assigned to ${String(assignedProfile.role).replaceAll("_", " ")}. Select that role to continue.`);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        profileError,
        role: profile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}