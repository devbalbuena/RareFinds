import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";
import { AddressList } from "@/components/account/AddressList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Shield, User, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Vault | RareFinds",
  description: "Manage your profile, shipping addresses, and orders.",
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const serializedAddresses = user.addresses.map((addr) => ({
    id: addr.id,
    fullName: addr.fullName,
    phone: addr.phone,
    street: addr.street,
    apartment: addr.apartment,
    city: addr.city,
    province: addr.province,
    postalCode: addr.postalCode,
    isDefault: addr.isDefault,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              Collector Profile
            </h1>
            {user.role === "ADMIN" ? (
              <Badge variant="grail" className="text-xs">
                ADMIN
              </Badge>
            ) : user.role === "STAFF" ? (
              <Badge variant="default" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                STAFF
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                VERIFIED COLLECTOR
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Vault member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-3">
          {(user.role === "ADMIN" || user.role === "STAFF") && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Staff / Admin Portal
            </Link>
          )}
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            Order History
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Profile Information Section */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ProfileForm
            initialName={user.name || ""}
            email={user.email}
          />
        </CardContent>
      </Card>

      {/* Saved Addresses Section */}
      <Card>
        <CardContent className="p-6">
          <AddressList addresses={serializedAddresses} />
        </CardContent>
      </Card>
    </div>
  );
}
