"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  FileText,
  ArrowLeft,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { Role } from "@prisma/client";
import { can, Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";

interface AdminSidebarProps {
  userRole: Role;
  userName: string;
  userEmail: string;
  storeName: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: Permission;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "admin:access",
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    permission: "order:view",
  },
  {
    label: "Inventory & Stock",
    href: "/admin/products",
    icon: Package,
    permission: "product:view",
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    permission: "customer:view",
  },
  {
    label: "Users & Staff",
    href: "/admin/users",
    icon: ShieldAlert,
    permission: "user:view",
  },
  {
    label: "Store Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "settings:view",
  },
  {
    label: "Audit Trail",
    href: "/admin/audit",
    icon: FileText,
    permission: "audit:view",
  },
];

export function AdminSidebar({
  userRole,
  userName,
  userEmail,
  storeName,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter navigation items by active database role permissions
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    can(userRole, item.permission)
  );

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 min-h-screen text-zinc-300">
      {/* Brand & Store header */}
      <div className="p-5 border-b border-zinc-800/80">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black font-black text-sm">
            RF
          </div>
          <div className="leading-none">
            <span className="font-black text-sm uppercase tracking-wider text-white block">
              {storeName}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-tight">
              Control Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Navigation
        </div>
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? "text-amber-400" : "text-zinc-500"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-zinc-800/80 space-y-3 bg-zinc-950/80">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              {userEmail}
            </p>
          </div>
          {userRole === Role.ADMIN ? (
            <Badge
              variant="default"
              className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 uppercase px-1.5 py-0"
            >
              ADMIN
            </Badge>
          ) : (
            <Badge
              variant="default"
              className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 uppercase px-1.5 py-0"
            >
              STAFF
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Storefront</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
