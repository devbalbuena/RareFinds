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
    const timer = setTimeout(() => {
      fetchOrders(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter, sortBy, fetchOrders]);

  // Handle Save Tracking
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
          message: `Order #${trackingModalOrder.orderNumber} dispatched via ${carrierInput} (Waybill: ${trackingNumberInput.trim()}).`,
        });
        setTrackingModalOrder(null);
        fetchOrders(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save tracking.";
      setNotice({ type: "error", message: msg });
    } finally {
      setTrackingLoading(false);
    }
  };

  // Handle Status Transition
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder || !selectedNewStatus) return;

    setStatusUpdateLoading(true);
    setNotice(null);

    try {
      const res = await updateOrderStatusAction({
        orderId: statusModalOrder.id,
        status: selectedNewStatus as "PENDING" | "PROCESSING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED",
        notes: statusNotesInput.trim() || undefined,
      });

      if (res.error) {
        setNotice({ type: "error", message: res.error });
      } else {
        const extraNote = selectedNewStatus === "DELIVERED" ? " Delivery timestamp recorded and COD reconciled." : "";
        setNotice({
          type: "success",
          message: `Order #${statusModalOrder.orderNumber} status changed to ${selectedNewStatus}.${extraNote}`,
        });
        setStatusModalOrder(null);
        fetchOrders(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setNotice({ type: "error", message: msg });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Handle Order Cancellation
  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;

    setCancelLoading(true);
    setNotice(null);

    try {
      const res = await cancelOrderAdminAction(
        cancelModalOrder.id,
        cancelReasonInput.trim() || "Staff manually initiated cancellation from fulfillment dashboard."
      );

      if (res.error) {
        setNotice({ type: "error", message: res.error });
      } else {
        setNotice({
          type: "success",
          message: `Order #${cancelModalOrder.orderNumber} has been CANCELLED and items restored to inventory.`,
        });
        setCancelModalOrder(null);
        fetchOrders(currentPage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order.";
      setNotice({ type: "error", message: msg });
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold gap-1">
            <Clock className="h-3 w-3 text-amber-600" /> PENDING
          </Badge>
        );
      case "PENDING_PAYMENT":
        return (
          <Badge className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-bold gap-1">
            <Clock className="h-3 w-3 text-orange-600" /> UNPAID HOLD
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold gap-1">
            <PackageCheck className="h-3 w-3 text-blue-600" /> PROCESSING
          </Badge>
        );
      case "PAID":
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold gap-1">
            <CreditCard className="h-3 w-3 text-emerald-600" /> PAID
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold gap-1">
            <Truck className="h-3 w-3 text-purple-600" /> DISPATCHED
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> DELIVERED
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] font-bold gap-1">
            <XCircle className="h-3 w-3 text-zinc-500" /> CANCELLED
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold gap-1">
            <Clock className="h-3 w-3 text-red-600" /> EXPIRED
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusTabs: { label: string; value: OrderStatus | "ALL"; countKey: string }[] = [
    { label: "All Orders", value: "ALL", countKey: "ALL" },
    { label: "Pending", value: "PENDING", countKey: "PENDING" },
    { label: "Processing & QC", value: "PROCESSING", countKey: "PROCESSING" },
    { label: "Dispatched", value: "SHIPPED", countKey: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED", countKey: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED", countKey: "CANCELLED" },
  ];

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-amber-500" />
            <span>Orders &amp; Fulfillment Center</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track customer orders, confirm COD allocations, assign courier waybills, and monitor the 4-step delivery lifecycle.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs shadow-2xs ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <div className="flex-1 font-medium leading-relaxed">{notice.message}</div>
          <button
            onClick={() => setNotice(null)}
            className="text-zinc-500 hover:text-zinc-900 transition-colors font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs by Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-200">
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
                  ? "bg-amber-500 text-black shadow-xs"
                  : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-2xs"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isSelected
                    ? "bg-black/10 text-black"
                    : "bg-zinc-100 text-zinc-500"
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
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer name, email, tracking..."
            className="pl-9 h-10 bg-white border-zinc-300 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 shadow-2xs"
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
            className="h-9 rounded-xl border border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="GCASH">GCash (Demo)</option>
            <option value="MAYA">Maya (Demo)</option>
            <option value="CARD">Card (Demo)</option>
            <option value="TEST">Test Simulation</option>
          </select>

          {/* Payment Status filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value as PaymentStatus | "ALL");
              setCurrentPage(1);
            }}
            className="h-9 rounded-xl border border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
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
            className="h-9 rounded-xl border border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="total_desc">Total (High to Low)</option>
            <option value="total_asc">Total (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Order # &amp; Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Courier &amp; Tracking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
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
                      className="hover:bg-zinc-50/70 transition-colors group"
                    >
                      {/* Order Number & Timestamp */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-bold text-zinc-900 hover:text-amber-600 font-mono text-xs transition-colors block"
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
                          <span className="font-bold text-zinc-900 block truncate">
                            {order.customerName}
                          </span>
                          <span className="text-[11px] text-zinc-500 block truncate">
                            {order.customerEmail}
                          </span>
                          <span className="text-[10px] text-zinc-400 block truncate">
                            {order.shippingAddress?.city}, {order.shippingAddress?.province}
                          </span>
                        </div>
                      </td>

                      {/* Sneaker Items Snapshot */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5 max-w-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="relative h-8 w-8 rounded-md bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                                {item.productImageUrl ? (
                                  <Image
                                    src={item.productImageUrl}
                                    alt={item.productTitle}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 text-zinc-400 m-auto" />
                                )}
                              </div>
                              <div className="truncate text-[11px]">
                                <span className="font-semibold text-zinc-900 block truncate">
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
                          <span className="font-black text-xs text-zinc-900 block">
                            {formatPrice(order.totalAmount)}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 border-zinc-200 bg-zinc-50 text-zinc-700 font-medium"
                            >
                              {order.paymentMethod}
                            </Badge>
                            {order.isSimulated && (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] py-0 px-1 font-bold uppercase">
                                DEMO
                              </Badge>
                            )}
                            {order.paymentStatus === "PAID" ? (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] py-0 px-1 font-bold">
                                PAID
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] py-0 px-1 font-bold">
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
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              Dispatched {new Date(order.shippedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {order.deliveredAt && (
                            <span className="text-[10px] text-emerald-700 block font-mono font-medium">
                              Delivered {new Date(order.deliveredAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Courier & Tracking Number */}
                      <td className="py-3.5 px-4 align-top">
                        {order.trackingNumber ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-900 text-[11px] block">
                              {order.shippingCarrier || "Courier"}
                            </span>
                            <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded inline-block font-semibold">
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
                            className="text-[11px] text-zinc-500 hover:text-indigo-600 font-semibold inline-flex items-center gap-1 transition-colors"
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
                            title="Assign or update courier tracking"
                            className="h-7 px-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50"
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
                            className="h-7 px-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                          </Button>

                          {/* Full Detail Link */}
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="View order details and packing invoice"
                              className="h-7 px-2.5 text-xs font-bold gap-1 border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-500" />
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
                                className="h-7 px-2 text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
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
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-600">
            <div>
              Page <span className="font-bold text-zinc-900">{currentPage}</span> of{" "}
              <span className="font-bold text-zinc-900">{totalPages}</span> ({totalCount} orders)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchOrders(currentPage - 1)}
                className="h-8 gap-1 text-xs border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchOrders(currentPage + 1)}
                className="h-8 gap-1 text-xs border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 shadow-2xs"
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
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-zinc-900">
              <Truck className="h-5 w-5 text-indigo-600" />
              <span>Courier &amp; Waybill Tracking</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Assign shipping carrier and tracking code for Order #{trackingModalOrder?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTracking} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Shipping Carrier / Courier
              </label>
              <select
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500"
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
              <label className="text-xs font-semibold text-zinc-700 block">
                Tracking Waybill Number
              </label>
              <Input
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                placeholder="e.g. 129038472910"
                className="h-10 bg-white border-zinc-300 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500"
                required
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50">
              <input
                type="checkbox"
                id="markShippedCheck"
                checked={markShippedCheck}
                onChange={(e) => setMarkShippedCheck(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="markShippedCheck" className="text-xs text-zinc-700 font-medium cursor-pointer">
                Automatically transition order status to <span className="font-bold text-indigo-700">DISPATCHED (SHIPPED)</span>
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTrackingModalOrder(null)}
                className="border-zinc-200 bg-white text-zinc-700 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={trackingLoading}
                size="sm"
                className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
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
        <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-zinc-900">
              <PackageCheck className="h-5 w-5 text-blue-600" />
              <span>Update Order Lifecycle Status</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Transition fulfillment step for Order #{statusModalOrder?.orderNumber}.
              Moving to <strong>DELIVERED</strong> will automatically record delivery time and reconcile COD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStatus} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Target Status
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value as OrderStatus)}
                className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 font-medium"
                required
              >
                <option value="PENDING">PENDING (Step 1: Order received, awaiting confirmation)</option>
                <option value="PROCESSING">PROCESSING (Step 2: Vault allocation &amp; QC)</option>
                <option value="PAID">PAID (Payment settled)</option>
                <option value="SHIPPED">SHIPPED (Step 3: Courier dispatched)</option>
                <option value="DELIVERED">DELIVERED (Step 4: Package handed to recipient)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Internal Note / Courier POD (Optional)
              </label>
              <Input
                value={statusNotesInput}
                onChange={(e) => setStatusNotesInput(e.target.value)}
                placeholder="e.g. Courier confirmed delivery to recipient"
                className="h-10 bg-white border-zinc-300 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOrder(null)}
                className="border-zinc-200 bg-white text-zinc-700 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={statusUpdateLoading}
                size="sm"
                className="bg-blue-600 text-white font-bold hover:bg-blue-700"
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
        <DialogContent className="sm:max-w-md bg-white border-rose-200 text-zinc-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <Ban className="h-5 w-5" />
              <span>Cancel Order &amp; Restock</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Cancelling Order #{cancelModalOrder?.orderNumber} will atomically restock all reserved sneakers and log a traceable stock adjustment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelOrder} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Reason for Cancellation
              </label>
              <Input
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Buyer requested cancellation before dispatch"
                className="h-10 bg-white border-zinc-300 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOrder(null)}
                className="border-zinc-200 bg-white text-zinc-700 font-semibold"
              >
                Keep Order
              </Button>
              <Button
                type="submit"
                disabled={cancelLoading}
                size="sm"
                className="bg-rose-600 text-white font-bold hover:bg-rose-700"
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
