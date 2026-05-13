"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormInput } from "@/components/FormInput";
import { GuestRoute } from "@/components/GuestRoute";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLoginMutation } from "@/hooks/use-login-mutation";
import { loginFormSchema, type LoginFormValues } from "@/schemas/login";

export default function LoginPage() {
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const pending = loginMutation.isPending || form.formState.isSubmitting;

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
    } catch {
      /* error shown via toast */
    }
  }

  return (
    <GuestRoute>
      <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/10 dark:shadow-black/30">
          <div className="mb-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              GhostGuard · Workforce integrity
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
              Welcome to PayGuard.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account to continue.
            </p>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormInput
              id="login-email"
              label="Email"
              type="email"
              autoComplete="username"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
            <FormInput
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register("password")}
            />

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg border border-border-strong bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </GuestRoute>
  );
}
