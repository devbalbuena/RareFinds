import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { UsersManagementTable } from "@/components/admin/UsersManagementTable";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const caller = await verifyAdminSession("user:view");

  const rawUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  const serializedUsers = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Staff &amp; Users</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-purple-400" />
            Staff &amp; User Controls
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage administrative privileges, onboard staff members, and deactivate compromised accounts.
          </p>
        </div>
      </div>

      <UsersManagementTable
        initialUsers={serializedUsers}
        currentUserId={caller.id}
      />
    </div>
  );
}
