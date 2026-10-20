"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { OrderStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import {
  SerializedAdminOrder,
  getAdminOrdersAction,
  updateOrderStatusAction,
  updateOrderTrackingAction,
  cancelOrderAdminAction,
} from "@/actions/admin-orders";
import { formatPrice } from "@/lib/utils";
import {
  Search,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  CreditCard,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface OrderManagementTableProps {
  initialOrders: SerializedAdminOrder[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  initialStatusCounts: Record<string, number>;
  initialSearch?: string;
  initialStatus?: OrderStatus | "ALL";
  userRole: Role;
}

const COURIER_PRESETS = [
  "LBC Express",
  "J&T Express",
  "2GO Express",
  "Grab Express",
  "Lalamove",
  "DHL Express",
  "FedEx",
];

export function OrderManagementTable({
  initialOrders,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialStatusCounts,
  initialSearch = "",
  initialStatus = "ALL",
  userRole,
}: OrderManagementTableProps) {
  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "ALL">(initialStatus);
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState<PaymentMethod | "ALL">("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<PaymentStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "total_desc" | "total_asc">("newest");
  const [currentPage, setCurrentPage] = React.useState(initialPage);

  // Data
  const [orders, setOrders] = React.useState<SerializedAdminOrder[]>(initialOrders);
  const [totalCount, setTotalCount] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [statusCounts, setStatusCounts] = React.useState(initialStatusCounts);
  const [loading, setLoading] = React.useState(false);

  // Status Banner
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fulfillment / Tracking Modal
  const [trackingModalOrder, setTrackingModalOrder] = React.useState<SerializedAdminOrder | null>(null);
  const [carrierInput, setCarrierInput] = React.useState("LBC Express");
  const [trackingNumberInput, setTrackingNumberInput] = React.useState("");
  const [markShippedCheck, setMarkShippedCheck] = React.useState(true);
  const [trackingLoading, setTrackingLoading] = React.useState(false);

  // Quick Status Transition Modal
  const [statusModalOrder, setStatusModalOrder] = React.useState<SerializedAdminOrder | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = React.useState<OrderStatus | "">("");
  const [statusNotesInput, setStatusNotesInput] = React.useState("");
  const [statusUpdateLoading, setStatusUpdateLoading] = React.useState(false);

  // Cancellation Modal
  const [cancelModalOrder, setCancelModalOrder] = React.useState<SerializedAdminOrder | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);

  // Fetch orders from server action
  const fetchOrders = React.useCallback(
    async (pageToFetch: number = currentPage) => {
      setLoading(true);
      try {
        const res = await getAdminOrdersAction({
          page: pageToFetch,
          pageSize: 15,
          search: searchQuery.trim() || undefined,
          status: statusFilter,
          paymentMethod: paymentMethodFilter,
          paymentStatus: paymentStatusFilter,
          sortBy,
        });

        setOrders(res.orders);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setCurrentPage(res.currentPage);
        setStatusCounts(res.statusCounts);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load orders.";
        setNotice({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter, sortBy, currentPage]
  );

  // Debounced search trigger
  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter, sortBy, fetchOrders]);

  // Submit tracking details
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder) return;
    if (!trackingNumberInput.trim()) {
      setNotice({ type: "error", message: "Please provide a valid tracking number." });
      return;
    }

    setTrackingLoading(true);
    setNotice(null);
    try {
      const res = await updateOrderTrackingAction({
        orderId: trackingModalOrder.id,
        shippingCarrier: carrierInput,
        trackingNumber: trackingNumberInput.trim(),
        markShipped: markShippedCheck,
      });

      if (res.error) {
        setNotice({ type: "error", message: res.error });
      } else {
        setNotice({
          type: "success",
          message: `Order ${trackingModalOrder.orderNumber} updated with tracking: ${trackingNumberInput.trim()} (${carrierInput})`,
        });
        setTrackingModalOrder(null);
        setTrackingNumberInput("");
        fetchOrders(currentPage);
      }
    } catch {
      setNotice({ type: "error", message: "Failed to update tracking details." });
    } finally {
      setTrackingLoading(false);
    }
  };

  // Submit status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder || !selectedNewStatus) return;

    setStatusUpdateLoading(true);
    setNotice(null);
    try {
      const res = await updateOrderStatusAction({
        orderId: statusModalOrder.id,
        status: selectedNewStatus as
          | "PENDING"
          | "PROCESSING"
          | "PAID"
          | "SHIPPED"
          | "DELIVERED"
          | "CANCELLED",
        notes: statusNotesInput.trim() || undefined,
      });

      if (res.error) {
        setNotice({ type: "error", message: res.error });
      } else {
        setNotice({
          type: "success",
          message: `Order ${statusModalOrder.orderNumber} transitioned to ${selectedNewStatus}.`,
        });
        setStatusModalOrder(null);
        setStatusNotesInput("");
        fetchOrders(currentPage);
      }
    } catch {
      setNotice({ type: "error", message: "Failed to update status." });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Submit order cancellation
  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (!cancelReasonInput.trim()) {
      setNotice({ type: "error", message: "Please specify a cancellation reason." });
      return;
    }

    setCancelLoading(true);
    setNotice(null);
    try {
      const res = await cancelOrderAdminAction(cancelModalOrder.id, cancelReasonInput.trim());
      if (res.error) {
        setNotice({ type: "error", message: res.error });
      } else {
        setNotice({
          type: "success",
          message: `Order ${cancelModalOrder.orderNumber} cancelled. 1-of-1 sneakers and inventory released.`,
        });
        setCancelModalOrder(null);
        setCancelReasonInput("");
        fetchOrders(currentPage);
      }
    } catch {
      setNotice({ type: "error", message: "Failed to cancel order." });
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-semibold gap-1">
            <Clock className="h-3 w-3" /> PENDING
          </Badge>
        );
      case "PENDING_PAYMENT":
        return (
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-semibold gap-1">
            <Clock className="h-3 w-3" /> UNPAID HOLD
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-semibold gap-1">
            <PackageCheck className="h-3 w-3" /> PROCESSING
          </Badge>
        );
      case "PAID":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] font-semibold gap-1">
            <CreditCard className="h-3 w-3" /> PAID
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-semibold gap-1">
            <Truck className="h-3 w-3" /> SHIPPED
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3" /> DELIVERED
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-semibold gap-1">
            <XCircle className="h-3 w-3" /> CANCELLED
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] font-semibold gap-1">
            <Clock className="h-3 w-3" /> EXPIRED
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusTabs: { label: string; value: OrderStatus | "ALL"; countKey: string }[] = [
    { label: "All Orders", value: "ALL", countKey: "ALL" },
    { label: "Pending", value: "PENDING", countKey: "PENDING" },
    { label: "Processing", value: "PROCESSING", countKey: "PROCESSING" },
    { label: "Shipped", value: "SHIPPED", countKey: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED", countKey: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED", countKey: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-amber-500" />
            <span>Orders & Fulfillment Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track customer orders, confirm COD dispatches, assign courier tracking numbers, and view delivery timelines.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium leading-relaxed">{notice.message}</div>
          <button
            onClick={() => setNotice(null)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs by Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-800/80">
        {statusTabs.map((tab) => {
          const isSelected = statusFilter === tab.value;
          const count = statusCounts[tab.countKey] || 0;

          return (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                isSelected
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? "bg-zinc-950/20 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer name, email, tracking..."
            className="pl-9 h-10 bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Payment Method filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => {
              setPaymentMethodFilter(e.target.value as PaymentMethod | "ALL");
              setCurrentPage(1);
            }}
            className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="TEST">Test Online Payment</option>
          </select>

          {/* Payment Status filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value as PaymentStatus | "ALL");
              setCurrentPage(1);
            }}
            className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Sort order */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as "newest" | "oldest" | "total_desc" | "total_asc");
              setCurrentPage(1);
            }}
            className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="total_desc">Total (High to Low)</option>
            <option value="total_asc">Total (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-4">Order # & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Courier & Tracking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Fetching orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No orders found matching the active filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = new Date(order.createdAt).toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Order Number & Timestamp */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-bold text-white hover:text-amber-400 font-mono text-xs transition-colors block"
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="text-[11px] text-zinc-500 block">
                            {dateStr} • {timeStr}
                          </span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5 max-w-[180px]">
                          <span className="font-semibold text-white block truncate">
                            {order.customerName}
                          </span>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {order.customerEmail}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            {order.shippingAddress?.city}, {order.shippingAddress?.province}
                          </span>
                        </div>
                      </td>

                      {/* Sneaker Items Snapshot */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5 max-w-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="relative h-7 w-7 rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0">
                                {item.productImageUrl ? (
                                  <Image
                                    src={item.productImageUrl}
                                    alt={item.productTitle}
                                    fill
                                    sizes="28px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <ShoppingBag className="h-3.5 w-3.5 text-zinc-600 m-auto" />
                                )}
                              </div>
                              <div className="truncate text-[11px]">
                                <span className="font-medium text-zinc-200 block truncate">
                                  {item.productTitle}
                                </span>
                                <span className="text-[10px] text-zinc-500 block">
                                  {item.variantDetails}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount & Payment Mode */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span className="font-black text-xs text-white block">
                            {formatPrice(order.totalAmount)}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 border-zinc-700 bg-zinc-950 text-zinc-400"
                            >
                              {order.paymentMethod}
                            </Badge>
                            {order.paymentStatus === "PAID" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1 font-semibold">
                                PAID
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] py-0 px-1 font-semibold">
                                UNPAID
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Order Status Badge */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          {getStatusBadge(order.status)}
                          {order.shippedAt && (
                            <span className="text-[10px] text-zinc-500 block">
                              Dispatched {new Date(order.shippedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Courier & Tracking Number */}
                      <td className="py-3.5 px-4 align-top">
                        {order.trackingNumber ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-white text-[11px] block">
                              {order.shippingCarrier || "Courier"}
                            </span>
                            <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded inline-block">
                              {order.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setTrackingModalOrder(order);
                              setCarrierInput("LBC Express");
                              setTrackingNumberInput("");
                              setMarkShippedCheck(true);
                            }}
                            className="text-[11px] text-zinc-500 hover:text-amber-400 font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Truck className="h-3 w-3" /> Assign courier
                          </button>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Assign Tracking / Courier Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTrackingModalOrder(order);
                              setCarrierInput(order.shippingCarrier || "LBC Express");
                              setTrackingNumberInput(order.trackingNumber || "");
                              setMarkShippedCheck(order.status !== "SHIPPED" && order.status !== "DELIVERED");
                            }}
                            title="Assign or update tracking"
                            className="h-7 px-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </Button>

                          {/* Quick Status Update */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStatusModalOrder(order);
                              setSelectedNewStatus(order.status);
                              setStatusNotesInput(order.notes || "");
                            }}
                            title="Update status"
                            className="h-7 px-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                          </Button>

                          {/* Full Detail Link */}
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="View order details and packing invoice"
                              className="h-7 px-2.5 text-xs font-semibold gap-1 border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white"
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-400" />
                              <span>View</span>
                            </Button>
                          </Link>

                          {/* Admin Cancel Button */}
                          {userRole === Role.ADMIN &&
                            order.status !== "CANCELLED" &&
                            order.status !== "DELIVERED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCancelModalOrder(order);
                                  setCancelReasonInput("");
                                }}
                                title="Cancel order and restock inventory"
                                className="h-7 px-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-400">
            <div>
              Page <span className="font-semibold text-white">{currentPage}</span> of{" "}
              <span className="font-semibold text-white">{totalPages}</span> ({totalCount} orders)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchOrders(currentPage - 1)}
                className="h-8 gap-1 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchOrders(currentPage + 1)}
                className="h-8 gap-1 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Assign Tracking Details */}
      <Dialog
        open={!!trackingModalOrder}
        onOpenChange={(open) => !open && setTrackingModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              <span>Courier & Tracking</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Assign shipping carrier and tracking code for Order #{trackingModalOrder?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTracking} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Shipping Carrier / Courier
              </label>
              <select
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {COURIER_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Other">Other / Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Tracking Waybill Number
              </label>
              <Input
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                placeholder="e.g. 129038472910"
                className="h-10 bg-zinc-900 border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-amber-500"
                required
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <input
                type="checkbox"
                id="markShippedCheck"
                checked={markShippedCheck}
                onChange={(e) => setMarkShippedCheck(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="markShippedCheck" className="text-xs text-zinc-300 font-medium cursor-pointer">
                Automatically transition order status to <span className="font-bold text-amber-400">SHIPPED</span>
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTrackingModalOrder(null)}
                className="border-zinc-800 bg-zinc-900 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={trackingLoading}
                size="sm"
                className="bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400"
              >
                {trackingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Tracking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Quick Status Transition */}
      <Dialog
        open={!!statusModalOrder}
        onOpenChange={(open) => !open && setStatusModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-blue-400" />
              <span>Update Order Status</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Transition order status for Order #{statusModalOrder?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStatus} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Target Status
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value as OrderStatus)}
                className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              >
                <option value="PENDING">PENDING (Awaiting confirmation)</option>
                <option value="PROCESSING">PROCESSING (Packing in vault)</option>
                <option value="PAID">PAID (Payment collected)</option>
                <option value="SHIPPED">SHIPPED (Handed to courier)</option>
                <option value="DELIVERED">DELIVERED (Successfully received)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Internal Note (Optional)
              </label>
              <Input
                value={statusNotesInput}
                onChange={(e) => setStatusNotesInput(e.target.value)}
                placeholder="e.g. Buyer verified via phone call"
                className="h-10 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOrder(null)}
                className="border-zinc-800 bg-zinc-900 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={statusUpdateLoading}
                size="sm"
                className="bg-blue-500 text-white font-bold hover:bg-blue-400"
              >
                {statusUpdateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Admin Cancel Order & Restock */}
      <Dialog
        open={!!cancelModalOrder}
        onOpenChange={(open) => !open && setCancelModalOrder(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-rose-400">
              <Ban className="h-5 w-5" />
              <span>Cancel Order & Restock</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Cancelling Order #{cancelModalOrder?.orderNumber} will atomically restock all reserved sneakers and log a traceable stock adjustment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelOrder} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Reason for Cancellation
              </label>
              <Input
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Buyer requested cancellation before dispatch"
                className="h-10 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-rose-500"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOrder(null)}
                className="border-zinc-800 bg-zinc-900 text-zinc-300"
              >
                Keep Order
              </Button>
              <Button
                type="submit"
                disabled={cancelLoading}
                size="sm"
                className="bg-rose-600 text-white font-bold hover:bg-rose-500"
              >
                {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel & Restock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
