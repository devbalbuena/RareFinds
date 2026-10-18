"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Mail, Loader2, ArrowRight } from "lucide-react";

interface SignInFormProps {
  callbackUrl?: string;
}

export function SignInForm({ callbackUrl = "/account" }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const searchParams = useSearchParams();
  const isDeactivatedRedirect = searchParams.get("error") === "deactivated";

  return (
    <Card className="border shadow-lg">
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle className="text-2xl font-black uppercase tracking-tight">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-xs">
          Sign in to access your saved addresses, cart, and account vault.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <CardContent className="space-y-4 pt-2">
          {isDeactivatedRedirect && !state?.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                Your account has been deactivated by an administrator. Please contact support.
              </div>
            </div>
          )}

          {state?.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{state.error}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="collector@example.com"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold uppercase tracking-wider text-muted-foreground block">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-10 font-bold text-sm tracking-wide"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In to Vault <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <div className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link
              href={`/sign-up${callbackUrl !== "/account" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="font-bold text-foreground hover:text-amber-500 underline underline-offset-4 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
