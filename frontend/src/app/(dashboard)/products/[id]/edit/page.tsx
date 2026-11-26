"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Skeleton } from "@eta-ui/react";
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
        <Skeleton variant="rounded" height={40} className="w-64" />
        <Skeleton variant="rounded" height={384} />
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data?.data) {
    return (
      <Alert
        status="error"
        variant="soft"
        title="Failed to load product"
        description={
          productQuery.error instanceof Error ? productQuery.error.message : "Product not found."
        }
      />
    );
  }

  return <ProductForm key={productQuery.data.data.id} product={productQuery.data.data} />;
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton variant="rounded" height={40} className="w-64" />
          <Skeleton variant="rounded" height={384} />
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}
