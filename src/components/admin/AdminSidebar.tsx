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
  Tags,
  ArrowLeft,
  LogOut,
  ShieldAlert,
  CircleDollarSign,
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

interface NavCategory {
  title: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        permission: "admin:access",
      },
    ],
  },
  {
    title: "Sales & Operations",
    items: [
      {
        label: "Orders & Fulfillment",
        href: "/admin/orders",
        icon: ShoppingBag,
        permission: "order:view",
      },
      {
        label: "Finance Ledger",
        href: "/admin/finance",
        icon: CircleDollarSign,
        permission: "finance:view",
      },
      {
        label: "Customer Directory",
        href: "/admin/customers",
        icon: Users,
        permission: "customer:view",
      },
    ],
  },
  {
    title: "Vault & Catalog",
    items: [
      {
        label: "Inventory & Stock",
        href: "/admin/products",
        icon: Package,
        permission: "product:view",
      },
      {
        label: "Brands & Categories",
        href: "/admin/catalog",
        icon: Tags,
        permission: "catalog:manage",
      },
    ],
  },
  {
    title: "System & Governance",
    items: [
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
    ],
  },
];

export function AdminSidebar({
  userRole,
  userName,
  userEmail,
  storeName,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter categories and items by active database role permissions
  const visibleCategories = NAV_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((item) => can(userRole, item.permission)),
  })).filter((category) => category.items.length > 0);

  return (
    <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0 min-h-screen text-zinc-700">
      {/* Brand & Store header */}
      <div className="p-5 border-b border-zinc-100">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black font-black text-sm shadow-xs">
            RF
          </div>
          <div className="leading-none">
            <span className="font-black text-sm uppercase tracking-wider text-zinc-900 block">
              {storeName}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tracking-tight">
              Control Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Categorized Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {visibleCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {category.title}
            </div>
            {category.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-900 border border-amber-500/30"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-amber-600" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-zinc-200 space-y-3 bg-zinc-50/80">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-zinc-900 truncate">{userName}</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              {userEmail}
            </p>
          </div>
          {userRole === Role.ADMIN ? (
            <Badge
              variant="default"
              className="text-[10px] bg-amber-500/15 text-amber-800 border-amber-500/30 uppercase px-1.5 py-0"
            >
              ADMIN
            </Badge>
          ) : (
            <Badge
              variant="default"
              className="text-[10px] bg-blue-500/15 text-blue-800 border-blue-500/30 uppercase px-1.5 py-0"
            >
              STAFF
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Storefront</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-zinc-200 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
