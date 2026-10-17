"use client";

import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Rarity } from "@prisma/client";

interface ProductImageGalleryProps {
  images: { id: string; url: string; altText?: string | null; isPrimary: boolean }[];
  title: string;
  rarity: Rarity;
  isSoldOut?: boolean;
}

export function ProductImageGallery({
  images,
  title,
  rarity,
  isSoldOut = false,
}: ProductImageGalleryProps) {
  const displayImages =
    images.length > 0
      ? images
      : [
          {
            id: "fallback",
            url: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85",
            altText: title,
            isPrimary: true,
          },
        ];

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const activeImage = displayImages[selectedIndex] || displayImages[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Large Image Stage */}
      <div className="relative aspect-square w-full rounded-2xl border bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center shadow-xs">
        <Image
          src={activeImage.url}
          alt={activeImage.altText || title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover object-center transition-all duration-300 ${
            isSoldOut ? "grayscale opacity-75" : ""
          }`}
        />

        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {rarity === Rarity.GRAIL && (
            <Badge variant="grail" className="px-3 py-1 text-xs">
              HOLY GRAIL
            </Badge>
          )}
          {rarity === Rarity.VERY_RARE && (
            <Badge variant="grail" className="px-3 py-1 text-xs">
              VERY RARE
            </Badge>
          )}
        </div>

        {/* Sold Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-20">
            <Badge
              variant="destructive"
              className="text-base sm:text-lg px-6 py-2 font-black uppercase tracking-widest shadow-2xl"
            >
              SOLD OUT
            </Badge>
          </div>
        )}
      </div>

      {/* Thumbnail Bar (if multiple images) */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative h-20 w-20 shrink-0 rounded-lg border overflow-hidden transition-all cursor-pointer ${
                selectedIndex === idx
                  ? "ring-2 ring-primary border-transparent scale-95"
                  : "opacity-70 hover:opacity-100 border-input"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText || `${title} photo ${idx + 1}`}
                fill
                sizes="80px"
                className="object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
