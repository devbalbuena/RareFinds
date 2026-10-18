import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { FileText, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  await verifyAdminSession("audit:view");
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 15;
  const skip = (currentPage - 1) * pageSize;

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      take: pageSize,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "USER_CREATED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ROLE_CHANGE":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "USER_DEACTIVATED":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "USER_ACTIVATED":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "SETTINGS_UPDATED":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Audit Trail</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-amber-400" />
            Security &amp; Administrative Audit Trail
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Immutable log of role changes, staff creations, account deactivations, and configuration updates.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Total Recorded Actions: <strong className="text-white">{totalCount}</strong>
        </div>
      </div>

      {/* Read-only Paginated Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-sans text-xs">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateFormatted = new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-400">
                        {dateFormatted}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-white font-sans font-semibold">
                          {log.user?.name || log.userEmail}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          {log.userEmail}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-sans font-bold px-2 py-0.5 border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        <span className="text-amber-400">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-zinc-500 text-[10px] block truncate max-w-[120px]">
                            {log.entityId}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-zinc-300 font-mono text-[10px]">
                        {log.details ? (
                          <span title={JSON.stringify(log.details, null, 2)}>
                            {JSON.stringify(log.details)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div>
              Page <strong className="text-white">{currentPage}</strong> of{" "}
              <strong className="text-white">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={currentPage <= 1}
                className="h-8 border-zinc-800 text-xs gap-1"
              >
                <Link
                  href={`/admin/audit?page=${currentPage - 1}`}
                  aria-disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={currentPage >= totalPages}
                className="h-8 border-zinc-800 text-xs gap-1"
              >
                <Link
                  href={`/admin/audit?page=${currentPage + 1}`}
                  aria-disabled={currentPage >= totalPages}
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
