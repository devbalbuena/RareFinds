import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
      <div className="p-4 rounded-full bg-secondary text-muted-foreground mb-4">
        <Search className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
        Sneaker Not Found
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
        The sneaker grail you are looking for may have been archived, delisted, or the link may be mistyped.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild variant="default">
          <Link href="/products" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sneaker Vault
          </Link>
        </Button>
      </div>
    </div>
  );
}
