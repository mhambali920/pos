"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ProductItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("product_type", typeFilter);
      const qs = params.toString();
      return apiFetch<ProductItem[]>(`/products${qs ? `?${qs}` : ""}`);
    },
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Master catalog supporting standard, variant, bundle, service, and non-stock products.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter product type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">All Types</option>
            <option value="standard">Standard</option>
            <option value="variant">Variant</option>
            <option value="bundle">Bundle</option>
            <option value="service">Service</option>
            <option value="non_stock">Non-Stock</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-md bg-muted" />
              <div className="h-12 animate-pulse rounded-md bg-muted" />
            </div>
          ) : isError ? (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load products."}
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4 font-medium">Product</th>
                    <th className="py-2.5 pr-4 font-medium">Type</th>
                    <th className="py-2.5 pr-4 font-medium">Primary SKU</th>
                    <th className="py-2.5 pr-4 font-medium">Selling Price</th>
                    <th className="py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => {
                    const primary = product.variants[0];
                    return (
                      <tr key={product.id}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image_path || "/images/products/placeholder.svg"}
                              alt={product.name}
                              onError={(e) => {
                                if (!e.currentTarget.src.endsWith("/images/products/placeholder.svg")) {
                                  e.currentTarget.src = "/images/products/placeholder.svg";
                                }
                              }}
                              className="h-10 w-12 rounded-md border border-border object-cover shrink-0"
                            />
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {product.category?.name ?? "Uncategorized"}
                                {product.variants.length > 1
                                  ? ` • ${product.variants.length} variants`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="muted">{product.product_type}</Badge>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">
                          {primary?.sku ?? "—"}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {primary ? formatCurrency(primary.selling_price) : "—"}
                        </td>
                        <td className="py-3">
                          <Badge variant={product.is_active ? "success" : "muted"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
