import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { getSession } from "@/lib/auth/require-admin";
import { Wordmark } from "@/components/site/wordmark";
import { Heading } from "@/components/ui/heading";
import { StarPattern } from "@/components/ui/star-pattern";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: t.admin.signInTitle,
  robots: { index: false, follow: false },
};

export default async function SignInPage(props: PageProps<"/admin/sign-in">) {
  const { error } = await props.searchParams;
  const session = await getSession();
  if (session && error !== "forbidden") redirect("/admin");

  return (
    <main id="main" className="relative isolate grid min-h-[100dvh] place-items-center overflow-hidden px-5 py-16">
      <StarPattern className="absolute inset-0 -z-10 text-clay" opacity={0.12} size={150} />
      <div className="w-full max-w-md">
        <Wordmark className="mb-14" />
        <div className="rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-ink/[0.06]">
          <div className="rounded-[calc(2rem-0.375rem)] bg-limestone p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-10">
            <Heading as="h1" size="sm">
              {t.admin.signInTitle}
            </Heading>
            <p className="mt-3 text-[0.9375rem] text-muted">{t.admin.signInLede}</p>
            <SignInForm initialError={error === "forbidden" ? t.admin.forbidden : undefined} />
          </div>
        </div>
      </div>
    </main>
  );
}
