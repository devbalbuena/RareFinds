"use client";

import * as React from "react";
import { useActionState } from "react";
import { updateProfileAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-medium">{state.error}</div>
        </div>
      )}

      {state?.success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-medium">{state.message}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Display Name
          </label>
          <Input
            name="name"
            defaultValue={initialName}
            required
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Email Address
          </label>
          <Input
            value={email}
            disabled
            className="h-10 text-sm bg-muted text-muted-foreground cursor-not-allowed"
          />
          <span className="text-[10px] text-muted-foreground">
            Contact support to change your account email.
          </span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className="gap-2 font-semibold text-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Update Profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
