"use client";

import * as React from "react";
import Image from "next/image";
import {
  createSignedUploadUrlAction,
  saveProductImageAction,
  reorderProductImagesAction,
  setPrimaryProductImageAction,
  deleteProductImageAction,
} from "@/actions/products";
import {
  UploadCloud,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ManagedProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface ProductImageManagerProps {
  productId: string;
  initialImages: ManagedProductImage[];
  onImagesChange?: (images: ManagedProductImage[]) => void;
}

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductImageManager({
  productId,
  initialImages,
  onImagesChange,
}: ProductImageManagerProps) {
  const [images, setImages] = React.useState<ManagedProductImage[]>(
    [...initialImages].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const canUploadMore = images.length < MAX_IMAGES;

  // Handle Multi-file Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);

    const fileList = Array.from(files);

    if (images.length + fileList.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed. You can only add ${MAX_IMAGES - images.length} more.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      let newlyAddedCount = 0;
      const currentList = [...images];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Processing ${i + 1} of ${fileList.length}: ${file.name}...`);

        // Client validation
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" exceeds the 5MB size limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error(`"${file.name}" has invalid type (${file.type}). Only JPEG, PNG, and WebP are allowed.`);
        }

        // 1. Get signed upload URL from server
        const signedRes = await createSignedUploadUrlAction(productId, file.name, file.type);
        if (signedRes.error || !("signedUrl" in signedRes) || !signedRes.signedUrl || !signedRes.storagePath) {
          throw new Error(signedRes.error || `Failed to prepare upload for ${file.name}`);
        }

        // 2. Direct upload to Supabase storage
        const uploadRes = await fetch(signedRes.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Upload to storage failed for ${file.name}: ${errText || uploadRes.statusText}`);
        }

        // 3. Verify on server and save to database
        const saveRes = await saveProductImageAction(
          productId,
          signedRes.storagePath,
          file.name.replace(/\.[^/.]+$/, "")
        );

        if (saveRes.error || !saveRes.image) {
          throw new Error(saveRes.error || `Verification failed for ${file.name}`);
        }

        currentList.push({
          id: saveRes.image.id,
          url: saveRes.image.url,
          altText: saveRes.image.altText,
          isPrimary: saveRes.image.isPrimary,
          sortOrder: saveRes.image.sortOrder,
        });
        newlyAddedCount++;
      }

      const sorted = [...currentList].sort((a, b) => a.sortOrder - b.sortOrder);
      setImages(sorted);
      onImagesChange?.(sorted);
      setSuccess(`Successfully uploaded and verified ${newlyAddedCount} image(s).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed.";
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reorder Left / Right
  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setError(null);
    setSuccess(null);

    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Update sortOrders locally
    const updated = reordered.map((img, idx) => ({
      ...img,
      sortOrder: idx,
    }));
    setImages(updated);

    try {
      const res = await reorderProductImagesAction(
        productId,
        updated.map((img) => img.id)
      );
      if (res.error) {
        setError(res.error);
        // revert
        setImages(images);
      } else {
        onImagesChange?.(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder.";
      setError(msg);
      setImages(images);
    }
  };

  // Set Primary
  const handleSetPrimary = async (imageId: string) => {
    setError(null);
    setSuccess(null);

    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    setImages(updated);

    try {
      const res = await setPrimaryProductImageAction(productId, imageId);
      if (res.error) {
        setError(res.error);
        setImages(images);
      } else {
        onImagesChange?.(updated);
        setSuccess("Primary hero image updated.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set primary image.";
      setError(msg);
      setImages(images);
    }
  };

  // Delete Image
  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image? The file will be removed from storage.")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await deleteProductImageAction(productId, imageId);
      if (res.error) {
        setError(res.error);
      } else {
        const remaining = images
          .filter((img) => img.id !== imageId)
          .map((img, idx) => ({ ...img, sortOrder: idx }));

        // If the deleted image was primary and there are remaining images, make first primary
        if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
          remaining[0].isPrimary = true;
        }

        setImages(remaining);
        onImagesChange?.(remaining);
        setSuccess("Image removed from vault catalog and storage.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete image.";
      setError(msg);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-amber-500" />
            Product Gallery &amp; Storage Imagery
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Signed direct-upload to Supabase. Images are verified for integrity, format, and magic bytes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={`text-xs font-semibold ${
              images.length >= MAX_IMAGES
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}
          >
            {images.length} / {MAX_IMAGES} Images
          </Badge>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {canUploadMore ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="product-images-input"
            disabled={uploading}
          />
          <label
            htmlFor="product-images-input"
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 p-6 text-center cursor-pointer transition-all hover:border-amber-500/60 hover:bg-zinc-900/50 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="text-xs font-semibold text-white">{uploadProgress || "Uploading..."}</p>
                <p className="text-[11px] text-zinc-500">Verifying storage integrity and magic bytes...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-1">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white">
                  Click or drag images here to upload
                </p>
                <p className="text-[11px] text-zinc-400">
                  JPEG, PNG, WebP up to 5MB each. Max {MAX_IMAGES - images.length} more image(s).
                </p>
              </div>
            )}
          </label>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-center text-xs text-zinc-400">
          Maximum limit of {MAX_IMAGES} images reached for this sneaker. Delete an image to upload a new one.
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={`group relative rounded-2xl border bg-zinc-950 overflow-hidden flex flex-col transition-all ${
                img.isPrimary
                  ? "border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.altText || `Image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />

                {/* Primary Badge */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-black shadow-md">
                    <Star className="h-3 w-3 fill-black" />
                    PRIMARY
                  </div>
                )}

                {/* Position Index */}
                <div className="absolute bottom-2 left-2 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                  #{index + 1}
                </div>
              </div>

              {/* Controls bar */}
              <div className="p-2.5 flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950/80">
                {/* Reorder Arrows */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "left")}
                    title="Move earlier"
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === images.length - 1}
                    onClick={() => handleMove(index, "right")}
                    title="Move later"
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Set Primary Button */}
                  {!img.isPrimary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetPrimary(img.id)}
                      title="Make primary hero image"
                      className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Star className="h-3 w-3 mr-1" /> Primary
                    </Button>
                  )}

                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(img.id)}
                    title="Delete image"
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 p-8 text-center text-zinc-500 text-xs">
          No images uploaded yet. Upload at least one high-resolution photo for the sneaker.
        </div>
      )}
    </div>
  );
}
