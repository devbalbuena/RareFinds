"use server";

import { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";

export interface SerializedCustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface SerializedCustomerAddress {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  isDefault: boolean;
}

export interface SerializedAdminCustomer {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  collectorTier: "MUSEUM_VIP" | "GRAIL_HUNTER" | "GOLD" | "SILVER" | "MEMBER";
  addresses: SerializedCustomerAddress[];
  recentOrders: SerializedCustomerOrder[];
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  repeatBuyers: number;
  totalCustomerLTV: number;
}

export interface GetAdminCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  sortBy?: "spend_desc" | "orders_desc" | "newest" | "oldest";
}

function deriveTier(totalSpent: number): SerializedAdminCustomer["collectorTier"] {
  if (totalSpent >= 100000) return "MUSEUM_VIP";
  if (totalSpent >= 50000) return "GRAIL_HUNTER";
  if (totalSpent >= 20000) return "GOLD";
  if (totalSpent >= 5000) return "SILVER";
  return "MEMBER";
}

export async function getAdminCustomersAction(params: GetAdminCustomersParams = {}) {
  await verifyAdminSession("customer:view");

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  if (params.role && params.role !== "ALL") {
    if (params.role === "CUSTOMER" || params.role === "STAFF" || params.role === "ADMIN") {
      where.role = params.role as Role;
    }
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };
  if (params.sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (params.sortBy === "newest") {
    orderBy = { createdAt: "desc" };
  }

  // Get total count matching search
  const totalCount = await prisma.user.count({ where });

  // Fetch users with their orders and addresses
  const users = await prisma.user.findMany({
    where,
    orderBy,
    skip: params.sortBy === "spend_desc" || params.sortBy === "orders_desc" ? undefined : skip,
    take: params.sortBy === "spend_desc" || params.sortBy === "orders_desc" ? 200 : pageSize,
    include: {
      orders: {
        where: {
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      addresses: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          street: true,
          city: true,
          province: true,
          isDefault: true,
        },
        take: 3,
      },
    },
  });

  // Map and calculate metrics for each customer
  const serializedCustomers: SerializedAdminCustomer[] = users.map((u) => {
    const totalOrders = u.orders.length;
    const totalSpent = u.orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);
    const lastOrderDate = u.orders.length > 0 ? u.orders[0].createdAt.toISOString() : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      totalOrders,
      totalSpent,
      lastOrderDate,
      collectorTier: deriveTier(totalSpent),
      addresses: u.addresses.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        phone: a.phone,
        street: a.street,
        city: a.city,
        province: a.province,
        isDefault: a.isDefault,
      })),
      recentOrders: u.orders.slice(0, 3).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
      })),
    };
  });

  // In-memory sort if by spend or orders count
  let finalCustomers = serializedCustomers;
  if (params.sortBy === "spend_desc") {
    finalCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
    finalCustomers = finalCustomers.slice(skip, skip + pageSize);
  } else if (params.sortBy === "orders_desc") {
    finalCustomers.sort((a, b) => b.totalOrders - a.totalOrders);
    finalCustomers = finalCustomers.slice(skip, skip + pageSize);
  }

  // Calculate high-level platform customer metrics
  const totalCustomers = await prisma.user.count({
    where: { role: "CUSTOMER" },
  });

  const activeCustomers = await prisma.user.count({
    where: { role: "CUSTOMER", isActive: true },
  });

  // Calculate repeat buyers (customers with >= 2 non-cancelled orders)
  const usersWithOrderCounts = await prisma.order.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      status: { not: "CANCELLED" },
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: 2 } },
    },
  });

  // Total LTV
  const ltvAggregate = await prisma.order.aggregate({
    where: { status: { not: "CANCELLED" } },
    _sum: { totalAmount: true },
  });

  const metrics: CustomerMetrics = {
    totalCustomers,
    activeCustomers,
    repeatBuyers: usersWithOrderCounts.length,
    totalCustomerLTV: Number(ltvAggregate._sum.totalAmount ?? 0),
  };

  return {
    customers: finalCustomers,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    metrics,
  };
}
