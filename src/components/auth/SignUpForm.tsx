"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface SignUpFormProps {
  callbackUrl?: string;
}

export function SignUpForm({ callbackUrl = "/account" }: SignUpFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  React.useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(
          `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}&registered=true`
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, callbackUrl, router]);

  return (
    <Card className="border shadow-lg">
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle className="text-2xl font-black uppercase tracking-tight">
          Create an Account
        </CardTitle>
        <CardDescription className="text-xs">
          Join RareFinds to reserve 1-of-1 sneakers and manage your orders.
        </CardDescription>
      </CardHeader>

      {state?.success ? (
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">
              Account Created Successfully!
            </h3>
            <p className="text-xs text-muted-foreground">
              Redirecting you to sign in...
            </p>
          </div>
          <Button asChild size="sm" className="mt-2">
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Sign In Now <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      ) : (
        <form action={formAction}>
          <CardContent className="space-y-3.5 pt-2">
            {state?.error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{state.error}</div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Juan Dela Cruz"
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
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
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="At least 8 chars (1 uppercase, 1 number)"
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-3">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 font-bold text-sm tracking-wide"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Registration <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <div className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/sign-in${callbackUrl !== "/account" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="font-bold text-foreground hover:text-amber-500 underline underline-offset-4 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
