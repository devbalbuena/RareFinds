"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  className,
  placeholder = "Search Jordan, Dunk, SKU, color...",
}: {
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [prevSearch, setPrevSearch] = React.useState(urlSearch);
  const [query, setQuery] = React.useState(urlSearch);

  if (prevSearch !== urlSearch) {
    setPrevSearch(urlSearch);
    setQuery(urlSearch);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("search", query.trim());
      params.set("page", "1");
    } else {
      params.delete("search");
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className || ""}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 h-9 text-sm rounded-full bg-secondary/50 border-input/60 focus-visible:bg-background transition-all"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </form>
  );
}
