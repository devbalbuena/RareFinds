"use client";

import * as React from "react";
import {
  TrendingUp,
  CircleDollarSign,
  CreditCard,
  Truck,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { FinanceOverviewData, getFinanceDataAction } from "@/actions/finance";
import { FinanceLedgerTable } from "./FinanceLedgerTable";

interface FinanceDashboardClientProps {
  initialData: FinanceOverviewData;
}

export function FinanceDashboardClient({ initialData }: FinanceDashboardClientProps) {
  const [data, setData] = React.useState<FinanceOverviewData>(initialData);
  const [includeSimulated, setIncludeSimulated] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleToggleSimulated(newVal: boolean) {
    setIncludeSimulated(newVal);
    setIsLoading(true);
    const res = await getFinanceDataAction({ includeSimulated: newVal });
    setIsLoading(false);
    if (res.data) {
      setData(res.data);
    }
  }

  const { metrics, paymentMethodBreakdown, deliveryMethodBreakdown, ledger } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner with Demo Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Finance Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              AUDITED
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time Philippine Peso settlement, net margins, and courier cash collections.
          </p>
        </div>

        {/* Demo transactions toggle */}
        <div className="flex items-center gap-3 bg-zinc-800/80 px-4 py-2.5 rounded-xl border border-zinc-700/60">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Include Demo Checkouts</span>
          </label>
          <button
            type="button"
            onClick={() => handleToggleSimulated(!includeSimulated)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              includeSimulated ? "bg-amber-500" : "bg-zinc-600"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                includeSimulated ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gross Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ₱{metrics.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              <span>{metrics.paidOrdersCount} completed orders</span>
              <span className="text-zinc-300">•</span>
              <span className="text-emerald-600 font-semibold">100% verified</span>
            </div>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Net Gross Margin</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ₱{metrics.netProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-blue-600 font-bold mt-1">
              {metrics.grossMarginPercent}% gross margin over unit cost
            </div>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Order Value (AOV)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ₱{metrics.averageOrderValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Per paid authentic sneaker order
            </div>
          </div>
        </div>

        {/* COD Cash Collection Pipeline */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">COD Cash Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ₱{metrics.codCashCollected.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-700 font-semibold">Collected</span>
              <span className="text-zinc-300">/</span>
              <span className="text-amber-700 font-semibold">
                ₱{metrics.codCashInTransit.toLocaleString("en-PH")} in transit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Delivery Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Methods */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-600" />
              Payment Gateway Distribution
            </h2>
            <span className="text-xs text-zinc-400">{paymentMethodBreakdown.length} methods active</span>
          </div>

          <div className="space-y-3">
            {paymentMethodBreakdown.map((item) => (
              <div key={item.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">({item.count} orders)</span>
                    <span className="font-bold text-zinc-900">
                      ₱{item.totalAmount.toLocaleString("en-PH")}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-zinc-900 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Logistics Distribution */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-zinc-600" />
              Fulfillment Logistics Split
            </h2>
            <span className="text-xs text-zinc-400">
              ₱{metrics.totalShippingCollected.toLocaleString("en-PH")} courier fees collected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {deliveryMethodBreakdown.map((item) => (
              <div
                key={item.method}
                className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 text-center space-y-1"
              >
                <div className="text-[11px] font-bold text-zinc-600">{item.label}</div>
                <div className="text-lg font-black text-zinc-900">{item.count}</div>
                <div className="text-[10px] text-zinc-400">
                  ₱{item.totalAmount.toLocaleString("en-PH")} volume
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">General Settlement Ledger</h2>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Updating ledger...</span>
            </div>
          )}
        </div>
        <FinanceLedgerTable ledger={ledger} />
      </div>
    </div>
  );
}
