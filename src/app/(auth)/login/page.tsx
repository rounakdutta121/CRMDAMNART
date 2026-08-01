"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth.schema";
import { useGlobalLoading } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import { formatDateIST } from "@/lib/datetime";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useGlobalLoading(pending);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginInput) {
    setError(null);
    startTransition(async () => {
      try {
        const healthResponse = await fetch("/api/health", { cache: "no-store" });
        const health = (await healthResponse.json()) as {
          database?: string;
        };
        if (health.database !== "connected") {
          setError(
            "Sign-in is temporarily unavailable because the database is disconnected. Check MongoDB Atlas network access and Vercel environment variables."
          );
          return;
        }
      } catch {
        setError(
          "Sign-in is temporarily unavailable. The application could not reach its health check."
        );
        return;
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="archive-grain flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="page-editorial w-full">
        <div className="mb-8 border-b border-[var(--border-strong)] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
              System / Lead operations
            </p>
            <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
              Filed {formatDateIST(new Date()).toUpperCase()}
            </p>
          </div>
          <h1 className="mt-4 font-editorial text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {APP_NAME}
          </h1>
          <p className="mt-2 font-meta text-[0.6875rem] text-[var(--ochre)]">
            Digital lead archive · Authorised personnel access
          </p>
        </div>

        <div className="border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap gap-3">
            <span className="border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-meta text-[0.625rem] text-[var(--ink-muted)]">
              Access / Restricted
            </span>
            <span className="border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-meta text-[0.625rem] text-[var(--ink-muted)]">
              Invitation only
            </span>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@damnart.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-[var(--danger)]">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-[var(--danger)]">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Verifying credentials…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--ink-subtle)]">
          Registration is invitation-only. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
