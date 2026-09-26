"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@/i18n/en";
import { authClient } from "@/lib/auth/client";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignInForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
    if (error) {
      setFormError(error.status === 401 || error.status === 400 ? t.admin.invalidCredentials : (error.message ?? t.admin.invalidCredentials));
      return;
    }
    router.replace("/admin");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 flex flex-col gap-6">
      <Field name="email" label={t.admin.email} error={errors.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
      </Field>
      <Field name="password" label={t.admin.password} error={errors.password?.message} required>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </Field>
      {formError ? (
        <p role="alert" className="rounded-xl bg-danger/[0.07] px-4 py-3 text-[0.875rem] text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" icon disabled={isSubmitting} className="mt-2 w-full justify-between pl-7">
        {isSubmitting ? t.admin.signingIn : t.buttons.signIn}
      </Button>
    </form>
  );
}
