import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth, type AppRole } from "@/lib/auth-context";

export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: AppRole[];
}) {
  const { user, profile, profileError, role, loading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Checking your session...</div>;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Authentication required</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Please sign in.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to access this TrialShield workspace.</p>
          <Link to="/login" search={{ redirect: location.pathname }} className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>
        </div>
      </div>
    );
  }

  if (!profile || !role || (roles && !roles.includes(role))) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Unauthorized</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">You do not have permission.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{profileError ? "Authentication is connected, but the profiles table is unavailable. Apply the Supabase migrations, then refresh." : profile ? "Your account is not assigned to this workspace." : "Your account requires administrator approval."}</p>
          {profileError && <button type="button" disabled={retrying} onClick={async () => { setRetrying(true); try { await refreshProfile(); } finally { setRetrying(false); } }} className="mt-4 inline-flex rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60">{retrying ? "Checking..." : "Retry profile check"}</button>}
          <Link to="/platform" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Return to platform</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}