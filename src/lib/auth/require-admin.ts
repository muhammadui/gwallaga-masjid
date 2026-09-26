import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type AuthSession } from "@/lib/auth/server";

export type StaffRole = "ADMIN" | "REGISTRAR";

/** Current session or null. Request-deduped. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Gate a server component, layout or server action to signed-in staff.
 * Redirects to /admin/sign-in when there is no session, or when the user's
 * role is not in `roles` (default: ADMIN and REGISTRAR).
 *
 *   const { user } = await requireAdmin();            // any staff
 *   const { user } = await requireAdmin(["ADMIN"]);   // admins only
 */
export async function requireAdmin(
  roles: StaffRole[] = ["ADMIN", "REGISTRAR"],
): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect("/admin/sign-in");
  const role = (session.user as { role?: string }).role as StaffRole | undefined;
  if (!role || !roles.includes(role)) redirect("/admin/sign-in?error=forbidden");
  return session;
}
