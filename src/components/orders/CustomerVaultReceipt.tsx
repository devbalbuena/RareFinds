"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  QrCode,
  X,
  FileText,
} from "lucide-react";

interface ReceiptItem {
  id: string;
  productTitle: string;
  variantDetails: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CustomerVaultReceiptProps {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  deliveryMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street?: string;
    apartment?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  items: ReceiptItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currencySymbol?: string;
  storeName?: string;
  qcVerifiedAt?: string | null;
}

export function CustomerVaultReceipt({
  orderNumber,
  createdAt,
  status,
  paymentMethod,
  deliveryMethod,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  items,
  subtotal,
  shippingFee,
  totalAmount,
  currencySymbol = "₱",
  storeName = "RareFinds Manila",
  qcVerifiedAt,
}: CustomerVaultReceiptProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold gap-1.5 h-8 border-primary/30 hover:border-primary/60 hover:bg-primary/5 cursor-pointer"
      >
        <FileText className="h-3.5 w-3.5 text-primary" />
        Vault Certificate &amp; Receipt
      </Button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 my-8">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-4 border-b print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-sm text-foreground">
                  Official Authenticity Certificate &amp; Digital Receipt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 h-8 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Printable Certificate Body */}
            <div className="printable-receipt space-y-6 text-foreground bg-background p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              {/* Certificate Header with Luxury Gold/Emerald Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dashed">
                <div className="space-y-1">
                  <span className="text-[10px] tracking-widest uppercase font-extrabold text-amber-500 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Serialized Certificate of Authenticity
                  </span>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{storeName}</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    The Vault of Grails &amp; Deadstock Kicks • BGC High Street, Taguig City
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                    <CheckCircle2 className="h-3 w-3" />
                    Single-Vendor Verified
                  </div>
                  <div className="font-mono text-xs font-bold text-muted-foreground">
                    REF: {orderNumber}
                  </div>
                </div>
              </div>

              {/* Order & Collector Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-2 bg-secondary/30 p-3.5 rounded-xl border">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Issued To
                  </span>
                  <span className="font-bold text-foreground block truncate">{customerName}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{customerEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Issue Date
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Delivery Mode
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {deliveryMethod.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Payment Method
                  </span>
                  <span className="font-medium text-foreground">{paymentMethod}</span>
                </div>
              </div>

              {/* Verified Items Table */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Authenticated Sneaker Vault Inventory
                </span>
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-secondary/50 border-b text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="p-3">Sneaker &amp; Specifications</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => (
                        <tr key={item.id} className="bg-card">
                          <td className="p-3">
                            <div className="font-bold text-foreground">{item.productTitle}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.variantDetails}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                              ✓ Physical verification seal attached • UV &amp; stitch verified
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">
                            {formatPrice(item.unitPrice, currencySymbol)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatPrice(item.subtotal, currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(subtotal, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping &amp; Insurance</span>
                    <span className="font-medium text-foreground">
                      {shippingFee > 0 ? formatPrice(shippingFee, currencySymbol) : "FREE"}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-sm text-foreground">
                    <span>Grand Total</span>
                    <span className="text-base text-primary">
                      {formatPrice(totalAmount, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vault Authenticity Guarantee Seal */}
              <div className="border-t pt-4 text-[11px] text-muted-foreground space-y-2 border-dashed">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>100% Guaranteed Authentic or 200% Money-Back</span>
                </div>
                <p className="leading-relaxed">
                  Every sneaker from RareFinds Manila undergoes a rigorous multi-point physical authenticity inspection before vault release. Serialized tamper-evident tags must remain intact for warranty and return claims.
                </p>
                {qcVerifiedAt && (
                  <p className="font-mono text-[10px] text-zinc-500">
                    Vault QC Verification Timestamp: {new Date(qcVerifiedAt).toLocaleString("en-US")}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
