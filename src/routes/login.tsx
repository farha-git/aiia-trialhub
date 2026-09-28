import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";

import { appRoles, useAuth, type AppRole } from "@/lib/auth-context";
import { landingPathByRole } from "@/lib/permissions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : "/platform",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && role && !submitting) void navigate({ to: landingPathByRole[role] });
  }, [navigate, role, submitting, user]);

  if (user) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!selectedRole) {
      setError("Select your assigned application role.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        await signIn(email, password, selectedRole);
        await navigate({ to: landingPathByRole[selectedRole] });
      } else {
        await signUp(email, password, fullName);
        setMessage("Account created. Check your email if confirmation is enabled.");
        setMode("sign-in");
      }
    } catch (submissionError) {
      console.error("Authentication failed:", submissionError);
      setError(getAuthErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-primary px-5 py-12 text-primary-foreground">
      <section className="w-full max-w-md border border-primary-foreground/15 bg-primary-foreground/5 p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">AIIA TrialShield</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-2 text-sm text-primary-foreground/65">{mode === "sign-in" ? "Access your clinical research workspace." : "New accounts start with CRC access until an administrator approves another role."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "sign-up" && <label className="block text-sm">Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 block w-full border border-primary-foreground/20 bg-transparent px-3 py-2.5 text-primary-foreground outline-none focus:border-accent" /></label>}
          <label className="block text-sm">Application role<select required value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as AppRole | "")} className="mt-2 block h-11 w-full border border-primary-foreground/20 bg-primary px-3 text-primary-foreground outline-none focus:border-accent"><option value="" disabled>Select your assigned role</option>{appRoles.map((appRole) => <option key={appRole} value={appRole}>{appRole.replaceAll("_", " ")}</option>)}</select><span className="mt-1 block text-[11px] text-primary-foreground/55">Your assigned role is verified from your account profile. This selection does not grant permissions.</span></label>
          <label className="block text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block w-full border border-primary-foreground/20 bg-transparent px-3 py-2.5 text-primary-foreground outline-none focus:border-accent" /></label>
          <label className="block text-sm">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full border border-primary-foreground/20 bg-transparent px-3 py-2.5 text-primary-foreground outline-none focus:border-accent" /></label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-accent">{message}</p>}
          <button disabled={submitting} className="w-full bg-accent px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-60">{submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(null); setMessage(null); }} className="mt-6 text-sm text-primary-foreground/65 underline underline-offset-4 hover:text-primary-foreground">{mode === "sign-in" ? "Need an account? Sign up" : "Already registered? Sign in"}</button>
      </section>
    </main>
  );
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (normalized.includes("email not confirmed")) return "Confirm your email address before signing in.";
  if (normalized.includes("profiles") || normalized.includes("schema cache")) return "Your account is valid, but the profile database setup is incomplete. Apply the Supabase migrations and retry.";
  if (message) return message;
  return "Authentication failed. Check your email, password, and assigned role.";
}