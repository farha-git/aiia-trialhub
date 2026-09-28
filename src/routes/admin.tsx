import { createFileRoute } from "@tanstack/react-router";

import { AuthGuard } from "@/components/auth-guard";
import { AdminWorkspace } from "@/components/workspaces";

export const Route = createFileRoute("/admin")({
  component: () => <AuthGuard roles={["ADMIN"]}><AdminWorkspace /></AuthGuard>,
});