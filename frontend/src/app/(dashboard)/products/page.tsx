"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  EmptyState,
  Heading,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProductItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

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
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Products
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Master catalog supporting standard, variant, bundle, service, and non-stock products.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, SKU, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAdornment={<Search className="h-4 w-4" />}
            wrapperClassName="w-60"
          />
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
          <Button asChild variant="solid" color="primary" leftIcon={<Plus className="h-4 w-4" />}>
            <Link href="/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="space-y-2.5">
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </div>
      ) : productsQuery.isError ? (
        <Alert
          status="error"
          variant="soft"
          title="Failed to load products"
          description={
            productsQuery.error instanceof Error
              ? productsQuery.error.message
              : "An unexpected error occurred."
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<Package className="h-6 w-6" />}
          title="No products found"
          description="Try adjusting your search or filter, or add a new product to the catalog."
          action={
            <Button asChild variant="solid" color="primary" size="sm">
              <Link href="/products/new">Add Product</Link>
            </Button>
          }
        />
      ) : (
        <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Primary SKU</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
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
                        className="h-10 w-12 shrink-0 rounded-md border border-eta-border object-cover"
                      />
                      <div>
                        <div className="font-medium text-eta-heading">{product.name}</div>
                        <div className="text-xs text-eta-muted">
                          {product.category?.name ?? "Uncategorized"}
                          {product.variants.length > 1
                            ? ` • ${product.variants.length} variants`
                            : ""}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="soft" color="neutral">
                      {product.product_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{primary?.sku ?? "—"}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {primary ? formatCurrency(primary.selling_price) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="soft" color={product.is_active ? "success" : "neutral"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/products/${product.id}/edit`}>
                        <IconButton
                          icon={<Pencil className="h-4 w-4" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Edit product"
                        />
                      </Link>
                      <IconButton
                        icon={<Trash2 className="h-4 w-4 text-eta-danger" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Delete product"
                        onClick={() => setDeleteTarget(product)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent intent="danger">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <span className="font-medium text-eta-heading">{deleteTarget?.name}</span>? This will
              hide the product from active catalog listings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="solid"
                color="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                }}
              >
                Archive
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
