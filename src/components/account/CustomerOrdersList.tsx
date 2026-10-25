"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  Calendar,
  CreditCard,
  Banknote,
  ArrowRight,
  Search,
  Filter,
  X,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface SerializedOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  isSimulated: boolean;
  totalAmount: number;
  createdAt: string;
  items: {
    id: string;
    productTitle: string;
    variantDetails: string;
    productImageUrl?: string | null;
  }[];
}

interface CustomerOrdersListProps {
  orders: SerializedOrderListItem[];
  currencySymbol?: string;
}

const statusBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    className: "border-amber-500/30 text-amber-500 bg-amber-500/10",
  },
  PENDING: {
    label: "Pending Confirmation",
    className: "border-blue-500/30 text-blue-500 bg-blue-500/10",
  },
  PAID: {
    label: "Paid & Secured",
    className: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
  },
  PROCESSING: {
    label: "Processing & QC",
    className: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
  SHIPPED: {
    label: "In Transit / Shipped",
    className: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
  DELIVERED: {
    label: "Delivered",
    className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-zinc-500 border-zinc-800",
  },
  EXPIRED: {
    label: "Hold Expired",
    className: "text-red-400 border-red-500/30 bg-red-500/5",
  },
};

type TabFilter = "all" | "active" | "delivered" | "cancelled";

export function CustomerOrdersList({
  orders,
  currencySymbol = "₱",
}: CustomerOrdersListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabFilter>("all");

  const counts = React.useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) =>
        ["PENDING", "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"].includes(o.status)
      ).length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      cancelled: orders.filter((o) => ["CANCELLED", "EXPIRED"].includes(o.status)).length,
    };
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "active") {
        if (!["PENDING", "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"].includes(order.status)) {
          return false;
        }
      } else if (activeTab === "delivered") {
        if (order.status !== "DELIVERED") return false;
      } else if (activeTab === "cancelled") {
        if (!["CANCELLED", "EXPIRED"].includes(order.status)) return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrderNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesSneaker = order.items.some((i) =>
          i.productTitle.toLowerCase().includes(q) || i.variantDetails.toLowerCase().includes(q)
        );
        const matchesStatus = order.status.toLowerCase().includes(q);
        if (!matchesOrderNumber && !matchesSneaker && !matchesStatus) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Status Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40 border overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Orders ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Progress ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("delivered")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "delivered"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Delivered ({counts.delivered})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "cancelled"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cancelled ({counts.cancelled})
          </button>
        </div>

        {/* Sneaker Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sneaker title, order #..."
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Result List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
            <div className="p-3.5 rounded-full bg-secondary text-muted-foreground">
              <Package className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-bold text-foreground">No Matching Orders Found</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {searchQuery
                  ? `No orders match "${searchQuery}". Try searching for another sneaker name or order number.`
                  : "No orders match this status category."}
              </p>
            </div>
            {(searchQuery || activeTab !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="text-xs font-semibold gap-1.5"
              >
                Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = statusBadgeConfig[order.status] || {
              label: order.status,
              className: "border-zinc-800 text-zinc-400",
            };

            return (
              <Card
                key={order.id}
                className="overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-xs"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Order Number, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm uppercase tracking-tight">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                        {order.isSimulated && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold uppercase">
                            Demo Mode
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {order.paymentMethod === "COD" ? (
                            <>
                              <Banknote className="h-3 w-3 text-emerald-500" />
                              <span>Cash on Delivery</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3 w-3 text-purple-400" />
                              <span>{order.paymentMethod} (Simulated)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Total Amount</span>
                        <span className="text-sm sm:text-base font-black text-foreground">
                          {formatPrice(order.totalAmount, currencySymbol)}
                        </span>
                      </div>
                      <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                        <Link href={`/account/orders/${order.id}`}>
                          Track Order
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Items Thumbnails */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg border text-xs"
                      >
                        <div className="relative h-12 w-12 rounded-md bg-secondary shrink-0 overflow-hidden">
                          {item.productImageUrl ? (
                            <Image
                              src={item.productImageUrl}
                              alt={item.productTitle}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 max-w-[220px]">
                          <div className="font-bold text-foreground truncate">
                            {item.productTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.variantDetails}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
