"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ProductItem } from "@/lib/types";
import { ProductForm } from "@/components/products/product-form";

function EditProductContent() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => apiFetch<ProductItem>(`/products/${productId}`),
    enabled: Number.isFinite(productId) && productId > 0,
  });

  if (productQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data?.data) {
    return (
      <p className="text-sm text-destructive">
        {productQuery.error instanceof Error
          ? productQuery.error.message
          : "Product not found."}
      </p>
    );
  }

  return <ProductForm key={productQuery.data.data.id} product={productQuery.data.data} />;
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}
