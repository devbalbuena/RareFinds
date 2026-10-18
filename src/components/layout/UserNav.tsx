"use client";

import * as React from "react";
import Link from "next/link";
import { User, LogOut, Package, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";

interface UserNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
        <Link href="/sign-in">
          <User className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </Link>
      </Button>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "RF";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs font-semibold rounded-full px-3"
          aria-label="User account menu"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {initials}
          </div>
          <span className="hidden sm:inline max-w-[100px] truncate">
            {user.name || "Collector"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold leading-none">{user.name || "User"}</p>
              {user.role === "ADMIN" ? (
                <Badge variant="grail" className="text-[10px] px-1 py-0">
                  ADMIN
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  COLLECTOR
                </Badge>
              )}
            </div>
            <p className="text-[11px] leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.role === "ADMIN" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Shield className="h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer gap-2 text-xs">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            Account & Addresses
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/account/orders" className="cursor-pointer gap-2 text-xs">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Order History
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer gap-2 text-xs text-red-600 dark:text-red-400 focus:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
