import { verifyAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { FileText, ArrowLeft, ChevronLeft, ChevronRight, Search, X, Filter } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    search?: string;
  }>;
}

const FILTER_CATEGORIES = [
  { label: "All Events", value: "ALL" },
  { label: "Orders & Fulfillment", value: "ORDERS" },
  { label: "Payments", value: "PAYMENTS" },
  { label: "Inventory", value: "STOCK" },
  { label: "Users & Staff", value: "USERS" },
  { label: "Settings", value: "SETTINGS" },
];

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  await verifyAdminSession("audit:view");
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 10;
  const skip = (currentPage - 1) * pageSize;

  const currentAction = params.action || "ALL";
  const currentSearch = params.search?.trim() || "";

  // Build filter where clause
  const where: Prisma.AuditLogWhereInput = {};

  if (currentAction !== "ALL") {
    if (currentAction === "ORDERS") {
      where.action = { startsWith: "ORDER_" };
    } else if (currentAction === "PAYMENTS") {
      where.action = {
        in: [
          "MANUAL_PAYMENT_APPROVED",
          "MANUAL_PAYMENT_REJECTED",
          "COD_REMITTANCE_SETTLED",
        ],
      };
    } else if (currentAction === "STOCK") {
      where.action = {
        in: ["STOCK_ADJUSTED", "STOCK_ADDED", "STOCK_REDUCED"],
      };
    } else if (currentAction === "USERS") {
      where.action = {
        in: ["USER_CREATED", "USER_ACTIVATED", "USER_DEACTIVATED", "ROLE_CHANGE"],
      };
    } else if (currentAction === "SETTINGS") {
      where.action = "SETTINGS_UPDATED";
    } else {
      where.action = currentAction;
    }
  }

  if (currentSearch) {
    where.OR = [
      { userEmail: { contains: currentSearch, mode: "insensitive" } },
      { entityId: { contains: currentSearch, mode: "insensitive" } },
      { action: { contains: currentSearch, mode: "insensitive" } },
    ];
  }

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
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
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "ROLE_CHANGE":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "USER_DEACTIVATED":
      case "ORDER_CANCELLED":
      case "MANUAL_PAYMENT_REJECTED":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "USER_ACTIVATED":
      case "ORDER_QC_CONFIRMED":
      case "ORDER_DELIVERED":
      case "MANUAL_PAYMENT_APPROVED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "SETTINGS_UPDATED":
      case "COD_REMITTANCE_SETTLED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "ORDER_STATUS_UPDATED":
      case "ORDER_DISPATCHED":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const renderAuditSummary = (log: typeof logs[0]) => {
    if (!log.details) return <span className="text-zinc-400">—</span>;
    const d = log.details as Record<string, unknown>;

    if (log.action === "ORDER_QC_CONFIRMED") {
      return (
        <span className="font-sans text-xs text-emerald-700 font-semibold">
          QC Passed • {String(d.orderNumber || "")} &rarr; PROCESSING
        </span>
      );
    }

    if (log.action === "ORDER_STATUS_UPDATED") {
      return (
        <span className="font-sans text-xs text-indigo-700 font-medium">
          {String(d.orderNumber || "")}: {String(d.previousStatus || "")} &rarr; {String(d.newStatus || "")}
        </span>
      );
    }

    if (log.action === "MANUAL_PAYMENT_APPROVED") {
      return (
        <span className="font-sans text-xs text-emerald-700 font-semibold">
          Payment Verified • ₱{Number(d.totalAmount || 0).toLocaleString("en-PH")}
        </span>
      );
    }

    if (log.action === "MANUAL_PAYMENT_REJECTED") {
      return (
        <span className="font-sans text-xs text-rose-700 font-semibold">
          Rejected: {String(d.reason || "Proof invalid")}
        </span>
      );
    }

    if (log.action === "COD_REMITTANCE_SETTLED") {
      return (
        <span className="font-sans text-xs text-amber-700 font-semibold">
          Remitted ₱{Number(d.amount || 0).toLocaleString("en-PH")} (Ref: {String(d.reference || "")})
        </span>
      );
    }

    if (log.action === "ORDER_DELIVERED") {
      return (
        <span className="font-sans text-xs text-emerald-700 font-semibold">
          Order Delivered • {String(d.orderNumber || "")} ({String(d.deliveryMethod || "")})
        </span>
      );
    }

    if (log.action === "ORDER_TRACKING_UPDATED") {
      return (
        <span className="font-sans text-xs text-blue-700 font-medium">
          Tracking: {String(d.shippingCarrier || "")} #{String(d.trackingNumber || "")}
        </span>
      );
    }

    if (log.action === "SETTINGS_UPDATED") {
      return (
        <span className="font-sans text-xs text-amber-800 font-medium">
          Store Config Modified
        </span>
      );
    }

    if (log.action === "ORDER_CANCELLED") {
      return (
        <span className="font-sans text-xs text-rose-700 font-semibold">
          Cancelled: {String(d.reason || "Staff cancellation")}
        </span>
      );
    }

    return (
      <span className="truncate block font-mono text-[10px] text-zinc-600" title={JSON.stringify(d, null, 2)}>
        {JSON.stringify(d)}
      </span>
    );
  };

  const buildFilterLink = (actionKey: string) => {
    const q = new URLSearchParams();
    if (actionKey !== "ALL") q.set("action", actionKey);
    if (currentSearch) q.set("search", currentSearch);
    return `/admin/audit${q.toString() ? `?${q.toString()}` : ""}`;
  };

  const buildPageLink = (pageNumber: number) => {
    const q = new URLSearchParams();
    q.set("page", String(pageNumber));
    if (currentAction !== "ALL") q.set("action", currentAction);
    if (currentSearch) q.set("search", currentSearch);
    return `/admin/audit?${q.toString()}`;
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6 text-zinc-900">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/admin" className="hover:text-zinc-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Audit Trail</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-amber-500" />
            Security &amp; Administrative Audit Trail
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Immutable log of role changes, staff creations, order updates, account deactivations, and configuration updates.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-500">
          Total Recorded Actions: <strong className="text-zinc-900">{totalCount}</strong>
        </div>
      </div>

      {/* Action Category Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_CATEGORIES.map((cat) => {
            const isSelected = currentAction === cat.value;
            return (
              <Link
                key={cat.value}
                href={buildFilterLink(cat.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 shadow-2xs"
                }`}
              >
                <span>{cat.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Search Bar */}
        <form method="GET" action="/admin/audit" className="flex items-center gap-2">
          {currentAction !== "ALL" && (
            <input type="hidden" name="action" value={currentAction} />
          )}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="Search user email, target ID, action..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            {currentSearch && (
              <Link
                href={buildFilterLink(currentAction)}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold shadow-2xs transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Read-only Paginated Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Timestamp</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Operator</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Action</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Target Entity</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[250px]">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
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
                    <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-500">
                        {dateFormatted}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-zinc-900 font-sans font-bold">
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

                      <td className="py-3 px-4 text-zinc-800">
                        <span className="font-bold text-amber-700">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-zinc-400 text-[10px] block truncate max-w-[120px]">
                            {log.entityId}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-sm truncate text-zinc-700">
                        {renderAuditSummary(log)}
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
          <div className="p-4 border-t border-zinc-200 bg-zinc-50/60 flex items-center justify-between text-xs text-zinc-600">
            <div>
              Page <strong className="text-zinc-900">{currentPage}</strong> of{" "}
              <strong className="text-zinc-900">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={currentPage <= 1}
                className="h-8 border-zinc-200 bg-white text-zinc-700 text-xs gap-1 shadow-2xs"
              >
                <Link
                  href={buildPageLink(currentPage - 1)}
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
                className="h-8 border-zinc-200 bg-white text-zinc-700 text-xs gap-1 shadow-2xs"
              >
                <Link
                  href={buildPageLink(currentPage + 1)}
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
