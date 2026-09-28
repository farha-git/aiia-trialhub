import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/unauthorized")({ component: UnauthorizedPage });

function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center bg-background px-5 text-center"><section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Unauthorized</p><h1 className="mt-3 font-display text-3xl font-semibold">You do not have permission.</h1><p className="mt-2 text-sm text-muted-foreground">Your account is not assigned to this workspace.</p><Link to="/platform" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Return to platform</Link></section></main>;
}