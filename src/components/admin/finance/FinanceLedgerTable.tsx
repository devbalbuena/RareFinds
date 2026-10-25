"use client";

import * as React from "react";
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  CreditCard,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { SerializedFinanceLedgerItem } from "@/actions/finance";

interface FinanceLedgerTableProps {
  ledger: SerializedFinanceLedgerItem[];
}

export function FinanceLedgerTable({ ledger }: FinanceLedgerTableProps) {
  const [search, setSearch] = React.useState("");
  const [selectedMethod, setSelectedMethod] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");

  const filteredItems = React.useMemo(() => {
    return ledger.filter((item) => {
      // Search filter
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q) ||
        (item.reference && item.reference.toLowerCase().includes(q));

      // Method filter
      const matchMethod = selectedMethod === "ALL" || item.paymentMethod === selectedMethod;

      // Status filter
      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "PAID" && item.paymentStatus === "PAID") ||
        (selectedStatus === "UNPAID" && item.paymentStatus !== "PAID");

      return matchSearch && matchMethod && matchStatus;
    });
  }, [ledger, search, selectedMethod, selectedStatus]);

  function handleExportCSV() {
    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Customer Email",
      "Payment Method",
      "Delivery Method",
      "Order Total (PHP)",
      "Shipping Fee (PHP)",
      "Payment Status",
      "Order Status",
      "Reference",
      "Simulated",
    ];

    const rows = filteredItems.map((item) => [
      item.orderNumber,
      new Date(item.createdAt).toISOString(),
      `"${item.customerName.replace(/"/g, '""')}"`,
      item.customerEmail,
      item.paymentMethod,
      item.deliveryMethod,
      item.amount.toFixed(2),
      item.shippingFee.toFixed(2),
      item.paymentStatus,
      item.status,
      item.reference || "N/A",
      item.isSimulated ? "YES" : "NO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `RareFinds_Finance_Ledger_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-zinc-50/50">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, Customer name, email, or reference..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 shadow-2xs"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="GCASH">GCash</option>
            <option value="PAYMAYA">Maya</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="MANUAL_TRANSFER">Bank / GCash Deposit</option>
            <option value="TEST">Simulation Sandbox</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 shadow-2xs"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid Only</option>
            <option value="UNPAID">Pending / Unpaid</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-100/60 text-zinc-500 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-200">
              <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Order / ID</th>
              <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Customer</th>
              <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Payment Method</th>
              <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Delivery</th>
              <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">Amount (PHP)</th>
              <th className="py-3 px-4 text-center whitespace-nowrap min-w-[90px]">Status</th>
              <th className="py-3 px-4 whitespace-nowrap min-w-[110px]">Date</th>
              <th className="py-3 px-4 text-center whitespace-nowrap min-w-[80px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  <CreditCard className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                  <p className="text-sm font-semibold text-zinc-600">No transactions found</p>
                  <p className="text-xs text-zinc-400">Try modifying your search or filter criteria.</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-zinc-900">{item.orderNumber}</span>
                      {item.isSimulated && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          DEMO
                        </span>
                      )}
                    </div>
                    {item.reference && (
                      <span className="text-[10px] text-zinc-400 font-mono block whitespace-nowrap truncate max-w-[200px]">
                        Ref: {item.reference}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-zinc-900">{item.customerName}</div>
                    <div className="text-[10px] text-zinc-500 whitespace-nowrap">{item.customerEmail}</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 whitespace-nowrap">
                      {item.paymentMethod === "COD" && "Cash on Delivery"}
                      {item.paymentMethod === "GCASH" && "GCash"}
                      {item.paymentMethod === "PAYMAYA" && "Maya"}
                      {item.paymentMethod === "CARD" && "Card"}
                      {item.paymentMethod === "MANUAL_TRANSFER" && "Manual Bank"}
                      {item.paymentMethod === "TEST" && "Sandbox"}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-zinc-600">
                    <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                      {item.deliveryMethod === "LOCAL_EXPRESS" && (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          NCR Express
                        </span>
                      )}
                      {item.deliveryMethod === "VAULT_PICKUP" && (
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          BGC Vault
                        </span>
                      )}
                      {item.deliveryMethod === "COURIER_NATIONWIDE" && (
                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                          <Truck className="w-3 h-3 text-amber-600" />
                          Air Courier
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-zinc-900 text-sm">
                      ₱{item.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {item.shippingFee > 0 && (
                      <div className="text-[10px] text-zinc-400">
                        +₱{item.shippingFee.toLocaleString("en-PH")} ship
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {item.paymentStatus === "PAID" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        PAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {item.paymentStatus}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-zinc-500 text-[11px] whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/admin/orders/${item.orderId}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[11px] transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
        <div>
          Showing <span className="font-bold text-zinc-800">{filteredItems.length}</span> of{" "}
          <span className="font-bold text-zinc-800">{ledger.length}</span> recorded orders
        </div>
        <div className="text-[11px] text-zinc-400">
          Philippine Vault Ledger • Auto-audited with real-time settlement tracking
        </div>
      </div>
    </div>
  );
}
