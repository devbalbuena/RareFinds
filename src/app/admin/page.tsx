import Link from "next/link";
import { OrderStatus, PaymentStatus, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  Clock,
  AlertTriangle,
  Package,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Settings,
  Users,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await verifyAdminSession("admin:access");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    pendingOrdersCount,
    lowStockCount,
    totalProductsCount,
    todayOrdersCount,
    todaySimulatedOrdersCount,
    recentOrders,
    paidOrders,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT],
        },
      },
    }),
    prisma.productVariant.count({
      where: {
        isSold: false,
        stockQty: { lte: 1 },
      },
    }),
    prisma.product.count({
      where: { status: "ACTIVE" },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startOfToday },
        isSimulated: false,
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startOfToday },
        isSimulated: true,
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        isSimulated: true,
        createdAt: true,
      },
    }),
    user.role === Role.ADMIN
      ? prisma.order.findMany({
          where: {
            paymentStatus: PaymentStatus.PAID,
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.EXPIRED] },
          },
          include: {
            items: {
              select: {
                subtotal: true,
                unitCost: true,
                quantity: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // Aggregate financial metrics for Owner/ADMIN
  let totalRevenue = 0;
  let realRevenue = 0;
  let demoRevenue = 0;
  let totalProfit = 0;
  let realProfit = 0;
  let demoProfit = 0;

  for (const order of paidOrders) {
    const orderRev = Number(order.totalAmount) - Number(order.shippingFee);
    totalRevenue += orderRev;
    if (order.isSimulated) {
      demoRevenue += orderRev;
    } else {
      realRevenue += orderRev;
    }

    for (const item of order.items) {
      const itemRevenue = Number(item.subtotal);
      const itemCost = item.unitCost ? Number(item.unitCost) * item.quantity : 0;
      const itemProfit = itemRevenue - itemCost;
      totalProfit += itemProfit;
      if (order.isSimulated) {
        demoProfit += itemProfit;
      } else {
        realProfit += itemProfit;
      }
    }
  }

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900">
              Store Command Center
            </h1>
            {user.role === Role.ADMIN ? (
              <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-xs font-bold uppercase">
                ADMIN ACCESS
              </Badge>
            ) : (
              <Badge className="bg-blue-500/15 text-blue-800 border-blue-500/30 text-xs font-bold uppercase">
                STAFF ACCESS
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Welcome back, <strong className="text-zinc-900">{user.name || user.email}</strong>. Live single-store operations overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>View Public Store</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Financial Overview (Visible Exclusively to Owner / ADMIN) */}
      {user.role === Role.ADMIN && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Vault Net Profit */}
          <Card className="bg-gradient-to-br from-zinc-900 to-black text-white border-zinc-800 shadow-md">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>Vault Net Profit (Owner Margin)</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                ₱{Math.round(totalProfit).toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Real Profit: ₱{Math.round(realProfit).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Demo Profit: ₱{Math.round(demoProfit).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Store Gross Revenue */}
          <Card className="bg-gradient-to-br from-zinc-900 to-black text-white border-zinc-800 shadow-md">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>Total Gross Sales (Paid Orders)</span>
                <Wallet className="h-4 w-4 text-sky-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                ₱{Math.round(totalRevenue).toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Real Sales: ₱{Math.round(realRevenue).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Demo Sales: ₱{Math.round(demoRevenue).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operational KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Pending Orders */}
        <Card className="bg-white border-zinc-200 text-zinc-900 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Pending Orders</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-zinc-900">{pendingOrdersCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Awaiting fulfillment / payment</p>
          </CardContent>
        </Card>

        {/* Stat 2: Low Stock */}
        <Card className="bg-white border-zinc-200 text-zinc-900 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-zinc-900">{lowStockCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Pairs with &le; 1 pair left in vault</p>
          </CardContent>
        </Card>

        {/* Stat 3: Total Products */}
        <Card className="bg-white border-zinc-200 text-zinc-900 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Active Pairs</span>
              <Package className="h-4 w-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-zinc-900">{totalProductsCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Active sneaker listings</p>
          </CardContent>
        </Card>

        {/* Stat 4: Today's Orders */}
        <Card className="bg-white border-zinc-200 text-zinc-900 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Today&apos;s Orders</span>
              <Calendar className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black text-zinc-900">{todayOrdersCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Real orders placed today {todaySimulatedOrdersCount > 0 && `(+${todaySimulatedOrdersCount} demo)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid based on Role */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/orders"
          className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">Order Management</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Fulfill pending customer orders, confirm COD allocations, and inspect tracking.
          </p>
        </Link>

        {user.role === Role.ADMIN && (
          <Link
            href="/admin/users"
            className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <Users className="h-5 w-5 text-purple-500" />
              <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">Staff &amp; User Controls</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Add staff accounts, promote registered customers, and manage access deactivations.
            </p>
          </Link>
        )}

        {user.role === Role.ADMIN && (
          <Link
            href="/admin/settings"
            className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <Settings className="h-5 w-5 text-emerald-500" />
              <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">Store Configuration</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Customize store branding, address, support contact, and base shipping fees.
            </p>
          </Link>
        )}
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Recent Vault Orders
            </h2>
            <p className="text-xs text-zinc-500">
              Latest transactions placed across the platform
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs text-amber-600 hover:underline font-semibold"
          >
            View All Orders &rarr;
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No orders placed yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900">
                      {ord.orderNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-200 text-zinc-700">
                      {ord.status}
                    </Badge>
                    {ord.isSimulated && (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10 text-[9px] font-mono uppercase">
                        DEMO
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[11px]">
                    Buyer: <span className="text-zinc-800 font-medium">{ord.customerName}</span> ({ord.customerEmail})
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="font-mono font-bold text-zinc-900">
                    ₱{Number(ord.totalAmount).toLocaleString()}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {new Date(ord.createdAt).toLocaleDateString()} via {ord.paymentMethod}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
