"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

/** Sign the current staff member out and return to the sign-in page. */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/sign-in");
}
