"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Users,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Eye,
  X,
  CreditCard,
  Crown,
  Download,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  SerializedAdminCustomer,
  CustomerMetrics,
} from "@/actions/admin-customers";

interface CustomerManagementTableProps {
  initialCustomers: SerializedAdminCustomer[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  metrics: CustomerMetrics;
  currencySymbol: string;
}

const TIER_CONFIG: Record<
  SerializedAdminCustomer["collectorTier"],
  { label: string; badgeClass: string; icon: typeof Crown }
> = {
  MUSEUM_VIP: {
    label: "Museum Curator VIP",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    icon: Crown,
  },
  GRAIL_HUNTER: {
    label: "Grail Hunter",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Sparkles,
  },
  GOLD: {
    label: "Gold Collector",
    badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
    icon: ShieldCheck,
  },
  SILVER: {
    label: "Silver Collector",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    icon: ShoppingBag,
  },
  MEMBER: {
    label: "Vault Member",
    badgeClass: "bg-zinc-50 text-zinc-600 border-zinc-200",
    icon: Users,
  },
};

export function CustomerManagementTable({
  initialCustomers,
  totalCount,
  totalPages,
  currentPage,
  metrics,
  currencySymbol,
}: CustomerManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input state
  const currentSearch = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = React.useState(currentSearch);

  // Profile modal state
  const [selectedCustomer, setSelectedCustomer] = React.useState<SerializedAdminCustomer | null>(null);

  // Sorting and role state
  const currentSort = searchParams.get("sortBy") || "spend_desc";
  const currentRole = searchParams.get("role") || "CUSTOMER";

  // URL update handler
  const updateQuery = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === null || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      });
      router.push(`/admin/customers?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ search: searchTerm.trim() || null, page: "1" });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateQuery({ search: null, page: "1" });
  };

  const handleExportCSV = () => {
    if (initialCustomers.length === 0) return;

    const headers = [
      "Customer Name",
      "Email",
      "Primary Phone",
      "Role",
      "Collector Tier",
      "Total Orders",
      "Total Spent (PHP)",
      "Last Order Date",
      "Registered Date",
    ];

    const rows = initialCustomers.map((c) => {
      const phone = c.addresses.find((a) => a.isDefault)?.phone || c.addresses[0]?.phone || "—";
      return [
        `"${(c.name || "Collector").replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        c.role,
        c.collectorTier,
        c.totalOrders,
        c.totalSpent.toFixed(2),
        c.lastOrderDate ? new Date(c.lastOrderDate).toISOString().split("T")[0] : "None",
        new Date(c.createdAt).toISOString().split("T")[0],
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `rarefinds-collectors-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* ── TOP METRICS CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Registered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Collectors
            </span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900">
            {metrics.totalCustomers}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {metrics.activeCustomers} currently active
          </div>
        </div>

        {/* Metric 2: Repeat Buyers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Repeat Buyers
            </span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900">
            {metrics.repeatBuyers}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Placed 2+ vault acquisitions
          </div>
        </div>

        {/* Metric 3: Total Platform LTV */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Vault Lifetime Value
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {formatPrice(metrics.totalCustomerLTV, currencySymbol)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Cumulative order volume
          </div>
        </div>

        {/* Metric 4: Average Spend */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Avg Order Value
            </span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900">
            {metrics.repeatBuyers > 0
              ? formatPrice(
                  metrics.totalCustomerLTV / Math.max(1, metrics.repeatBuyers),
                  currencySymbol
                )
              : "₱0.00"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Per repeat collector
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-md flex items-center"
          >
            <Search className="w-4 h-4 absolute left-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name or email..."
              className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Role and Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter Tabs */}
            <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200 text-xs">
              {(["CUSTOMER", "ALL", "STAFF", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => updateQuery({ role: r === "CUSTOMER" ? null : r, page: "1" })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    (currentRole === r || (!searchParams.get("role") && r === "CUSTOMER"))
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {r === "CUSTOMER" ? "Customers" : r === "ALL" ? "All Users" : r}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={currentSort}
                onChange={(e) => updateQuery({ sortBy: e.target.value, page: "1" })}
                className="bg-white border border-zinc-300 text-xs text-zinc-700 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-amber-500 shadow-2xs font-medium cursor-pointer"
              >
                <option value="spend_desc">Top Spender (VIP)</option>
                <option value="orders_desc">Most Orders</option>
                <option value="newest">Newest Joined</option>
                <option value="oldest">Oldest Joined</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={initialCustomers.length === 0}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Download customer directory as CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CUSTOMERS DIRECTORY TABLE ───────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Collector</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                    No customer accounts match your search filter.
                  </td>
                </tr>
              ) : (
                initialCustomers.map((cust) => {
                  const tier = TIER_CONFIG[cust.collectorTier];
                  const TierIcon = tier.icon;
                  const initials = cust.name
                    ? cust.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : cust.email.substring(0, 2).toUpperCase();

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-zinc-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-xs text-amber-800 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 truncate">
                              {cust.name || "Unnamed Collector"}
                            </div>
                            <div className="text-zinc-500 truncate text-[11px]">
                              {cust.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tier.badgeClass}`}
                        >
                          <TierIcon className="w-3 h-3" />
                          {tier.label}
                        </span>
                      </td>

                      {/* Role Pill */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            cust.role === "ADMIN"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : cust.role === "STAFF"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {cust.role}
                        </span>
                      </td>

                      {/* Orders Count with Quick link */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {cust.totalOrders > 0 ? (
                          <Link
                            href={`/admin/orders?search=${encodeURIComponent(cust.email)}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-zinc-900 hover:text-amber-600 underline decoration-zinc-300"
                            title="View all orders for this customer"
                          >
                            {cust.totalOrders}
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
                          </Link>
                        ) : (
                          <span className="font-mono text-zinc-400">0</span>
                        )}
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black text-zinc-900">
                        {cust.totalSpent > 0 ? (
                          <span className="text-amber-700">
                            {formatPrice(cust.totalSpent, currencySymbol)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">₱0.00</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 text-[11px]">
                        {new Date(cust.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 shadow-2xs font-semibold transition"
                        >
                          <Eye className="w-3 h-3 text-zinc-500" />
                          Profile
                        </button>
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
              Showing page <strong>{currentPage}</strong> of{" "}
              <strong>{totalPages}</strong> ({totalCount} total collectors)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQuery({ page: String(currentPage - 1) })}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateQuery({ page: String(currentPage + 1) })}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CUSTOMER PROFILE INSPECTOR MODAL ────────────────────────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl text-zinc-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-800 text-base">
                  {selectedCustomer.name
                    ? selectedCustomer.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : selectedCustomer.email.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    {selectedCustomer.name || "Customer Profile"}
                  </h3>
                  <div className="text-xs text-zinc-500">
                    {selectedCustomer.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <div className="text-[11px] text-zinc-500 uppercase font-bold">Tier</div>
                <div className="text-xs font-bold text-amber-700 mt-0.5">
                  {TIER_CONFIG[selectedCustomer.collectorTier].label}
                </div>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <div className="text-[11px] text-zinc-500 uppercase font-bold">Orders</div>
                <div className="text-xs font-bold font-mono text-zinc-900 mt-0.5">
                  {selectedCustomer.totalOrders}
                </div>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <div className="text-[11px] text-zinc-500 uppercase font-bold">Total Spend</div>
                <div className="text-xs font-bold font-mono text-emerald-700 mt-0.5">
                  {formatPrice(selectedCustomer.totalSpent, currencySymbol)}
                </div>
              </div>
            </div>

            {/* Shipping Addresses */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Saved Shipping Addresses
              </h4>
              {selectedCustomer.addresses.length === 0 ? (
                <div className="text-xs text-zinc-500 italic p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  No saved addresses on profile yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-zinc-900">{addr.fullName}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500">{addr.phone}</div>
                      <div>
                        {addr.street}, {addr.city}, {addr.province}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  Recent Vault Purchases
                </h4>
                {selectedCustomer.totalOrders > 0 && (
                  <Link
                    href={`/admin/orders?search=${encodeURIComponent(selectedCustomer.email)}`}
                    className="text-xs text-amber-700 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    View All in Orders
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {selectedCustomer.recentOrders.length === 0 ? (
                <div className="text-xs text-zinc-500 italic p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  No purchase history found for this user.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-zinc-900">
                          {ord.orderNumber}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString()} •{" "}
                          <span className="text-zinc-700 font-bold">
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-zinc-900">
                          {formatPrice(ord.totalAmount, currencySymbol)}
                        </span>
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-2xs"
                          title="Open order details"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
