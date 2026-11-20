"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProductItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const productsQuery = useQuery({
    queryKey: ["products", search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter && typeFilter !== "all") params.set("product_type", typeFilter);
      const qs = params.toString();
      return apiFetch<ProductItem[]>(`/products${qs ? `?${qs}` : ""}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Product archived.");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Master catalog supporting standard, variant, bundle, service, and non-stock products.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="variant">Variant</SelectItem>
              <SelectItem value="bundle">Bundle</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="non_stock">Non-Stock</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {productsQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-md bg-muted" />
              <div className="h-12 animate-pulse rounded-md bg-muted" />
            </div>
          ) : productsQuery.isError ? (
            <p className="text-sm text-destructive">
              {productsQuery.error instanceof Error
                ? productsQuery.error.message
                : "Failed to load products."}
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Primary SKU</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const primary = product.variants[0];
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{product.product_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{primary?.sku ?? "—"}</TableCell>
                      <TableCell className="font-medium font-mono">
                        {primary ? formatCurrency(primary.selling_price) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "success" : "muted"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/products/${product.id}/edit`}>
                            <Button size="icon" variant="ghost" aria-label="Edit product">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete product"
                            onClick={() => deleteMutation.mutate(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
