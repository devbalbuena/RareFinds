"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { uploadPaymentProofAction } from "@/actions/orders";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  CreditCard,
  FileCheck,
  RefreshCw,
} from "lucide-react";

interface ManualPaymentProofDropzoneProps {
  orderId: string;
  orderNumber: string;
  initialProofKey?: string | null;
  uploadedAt?: string | null;
  instructions?: string | null;
  expiresAt?: string | null;
}

export function ManualPaymentProofDropzone({
  orderId,
  orderNumber,
  initialProofKey,
  uploadedAt: initialUploadedAt,
  instructions,
  expiresAt,
}: ManualPaymentProofDropzoneProps) {
  const [proofKey, setProofKey] = React.useState<string | null>(initialProofKey || null);
  const [uploadedAt, setUploadedAt] = React.useState<string | null>(initialUploadedAt || null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isChangingProof, setIsChangingProof] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File exceeds 5MB size limit.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a receipt image before submitting.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("proofFile", selectedFile);

    try {
      const res = await uploadPaymentProofAction(orderId, formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(res.message || "Receipt submitted for staff verification.");
        setProofKey(res.paymentProofKey || "uploaded");
        setUploadedAt(new Date().toISOString());
        setIsChangingProof(false);
        setSelectedFile(null);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during receipt upload.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-2xl border p-5 bg-card/60 backdrop-blur-sm space-y-4">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Manual Transfer Receipt Verification
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Direct GCash or Bank Deposit confirmation slip for order {orderNumber}.
          </p>
        </div>

        {proofKey && !isChangingProof ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5" />
            Under Staff Verification
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <UploadCloud className="h-3.5 w-3.5" />
            Receipt Required
          </span>
        )}
      </div>

      {/* Transfer Bank & E-Wallet Instructions */}
      <div className="p-3.5 rounded-xl border bg-secondary/30 text-xs space-y-2">
        <div className="font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Official Vault Transfer Details:
        </div>
        <div className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed font-mono">
          {instructions ||
            "GCash: 0917-888-9999 (RareFinds Vault Inc.)\nBDO Unibank: 0012-3456-7890 (RareFinds Manila Corp)\nPlease include your Order Number as payment reference."}
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Uploaded State Card */}
      {proofKey && !isChangingProof ? (
        <div className="p-4 rounded-xl border border-dashed bg-secondary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCheck className="h-5 w-5 text-emerald-500" />
              <div className="text-xs">
                <span className="font-bold text-foreground block">
                  Proof of Transfer Uploaded
                </span>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  {uploadedAt
                    ? `Uploaded on ${new Date(uploadedAt).toLocaleString("en-US")}`
                    : "Receipt registered in vault archive."}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangingProof(true)}
              className="text-xs gap-1.5 h-8 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Re-upload Receipt
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            Our finance team verifies incoming transfers against vault inventory allocations. Once confirmed, your order advances to quality control and dispatch.
          </p>
        </div>
      ) : (
        /* Upload Form Dropzone */
        <form onSubmit={handleUpload} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-input hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-secondary/10 hover:bg-secondary/20 space-y-2"
          >
            {previewUrl ? (
              <div className="space-y-2">
                <div className="relative h-44 w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                  <Image src={previewUrl} alt="Receipt preview" fill className="object-contain" />
                </div>
                <p className="text-xs font-semibold text-primary">Click to choose a different image</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">
                  Click or drag and drop your transfer slip screenshot
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports JPG, PNG, or WebP up to 5MB
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            {isChangingProof && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsChangingProof(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
            )}

            <div className="ml-auto">
              <Button
                type="submit"
                disabled={!selectedFile || isPending}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading Receipt...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    Submit Receipt for Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
