"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  BrandItem,
  CategoryItem,
  ProductItem,
  TaxItem,
  UnitItem,
} from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFormProps {
  product?: ProductItem | null;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(product);
  const primaryVariant = product?.variants[0];

  const [name, setName] = useState(product?.name ?? "");
  const [productType, setProductType] = useState<string>(product?.product_type ?? "standard");
  const [categoryId, setCategoryId] = useState(
    product?.category ? String(product.category.id) : "none"
  );
  const [brandId, setBrandId] = useState(product?.brand ? String(product.brand.id) : "none");
  const [baseUnitId, setBaseUnitId] = useState(
    product?.base_unit ? String(product.base_unit.id) : ""
  );
  const [taxId, setTaxId] = useState(product?.tax ? String(product.tax.id) : "none");
  const [description, setDescription] = useState(product?.description ?? "");
  const [trackInventory, setTrackInventory] = useState(product?.track_inventory ?? true);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  const [sku, setSku] = useState(primaryVariant?.sku ?? "");
  const [barcode, setBarcode] = useState(primaryVariant?.barcodes?.[0]?.barcode ?? "");
  const [purchasePrice, setPurchasePrice] = useState(primaryVariant?.purchase_price ?? "0");
  const [sellingPrice, setSellingPrice] = useState(primaryVariant?.selling_price ?? "");
  const [minSellingPrice, setMinSellingPrice] = useState(primaryVariant?.min_selling_price ?? "0");
  const [priceChangeReason, setPriceChangeReason] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return product?.image_path || "/images/products/placeholder.svg";
  }, [imageFile, product?.image_path]);

  useEffect(() => {
    if (!imageFile) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile, previewUrl]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryItem[]>("/categories"),
  });

  const brandsQuery = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetch<BrandItem[]>("/brands"),
  });

  const unitsQuery = useQuery({
    queryKey: ["units"],
    queryFn: () => apiFetch<UnitItem[]>("/units"),
  });

  const taxesQuery = useQuery({
    queryKey: ["taxes"],
    queryFn: () => apiFetch<TaxItem[]>("/taxes"),
  });

  const resolvedUnitId = baseUnitId || String(unitsQuery.data?.data[0]?.id ?? "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (categoryId !== "none") formData.append("category_id", categoryId);
      if (brandId !== "none") formData.append("brand_id", brandId);
      if (taxId !== "none") formData.append("tax_id", taxId);
      if (description.trim()) formData.append("description", description.trim());
      formData.append("track_inventory", trackInventory ? "1" : "0");
      formData.append("is_active", isActive ? "1" : "0");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditing && product) {
        formData.append("_method", "PUT");
        if (resolvedUnitId) formData.append("base_unit_id", resolvedUnitId);
        if (priceChangeReason.trim()) {
          formData.append("price_change_reason", priceChangeReason.trim());
        }
        if (primaryVariant) {
          formData.append("variants[0][id]", String(primaryVariant.id));
          formData.append("variants[0][name]", name.trim());
          formData.append("variants[0][purchase_price]", purchasePrice || "0");
          formData.append("variants[0][selling_price]", sellingPrice || "0");
          formData.append("variants[0][min_selling_price]", minSellingPrice || "0");
        }

        return apiFetch<ProductItem>(`/products/${product.id}`, {
          method: "POST",
          body: formData,
        });
      }

      formData.append("product_type", productType);
      formData.append("base_unit_id", resolvedUnitId);
      formData.append("variants[0][sku]", sku.trim());
      formData.append("variants[0][name]", name.trim());
      formData.append("variants[0][purchase_price]", purchasePrice || "0");
      formData.append("variants[0][selling_price]", sellingPrice);
      formData.append("variants[0][min_selling_price]", minSellingPrice || "0");
      if (barcode.trim()) {
        formData.append("variants[0][barcodes][0]", barcode.trim());
      }

      return apiFetch<ProductItem>("/products", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast.success(isEditing ? "Product updated successfully." : "Product created successfully.");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      if (product) {
        void queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      }
      router.push("/products");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to save product.");
    },
  });

  const canSubmit =
    !saveMutation.isPending &&
    name.trim().length > 0 &&
    (isEditing || (sku.trim().length > 0 && sellingPrice.trim().length > 0 && resolvedUnitId !== ""));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" size="icon" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEditing ? `Edit Product — ${product?.name}` : "Add New Product"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Update product information, pricing, and product photo."
                : "Create a new catalog product with SKU, pricing, and photo."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button disabled={!canSubmit} onClick={() => saveMutation.mutate()}>
            <Save className="h-4 w-4" />
            {isEditing ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic product identity and classification.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="prod-name">Product Name</Label>
                <Input
                  id="prod-name"
                  placeholder="e.g. Kopi Arabika 250g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Product Type</Label>
                <Select
                  value={productType}
                  disabled={isEditing}
                  onValueChange={(v) => setProductType(v ?? "standard")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="variant">Variant</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="non_stock">Non-Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Base Unit</Label>
                <Select value={resolvedUnitId} onValueChange={(v) => setBaseUnitId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(unitsQuery.data?.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.code} — {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "none")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {(categoriesQuery.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={(v) => setBrandId(v ?? "none")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Brand</SelectItem>
                    {(brandsQuery.data?.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tax</Label>
                <Select value={taxId} onValueChange={(v) => setTaxId(v ?? "none")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tax</SelectItem>
                    {(taxesQuery.data?.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="prod-desc">Description</Label>
                <Textarea
                  id="prod-desc"
                  placeholder="Optional product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SKU &amp; Pricing</CardTitle>
              <CardDescription>
                Primary variant identifiers and decimal-safe pricing rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-sku">Primary SKU</Label>
                <Input
                  id="prod-sku"
                  placeholder="e.g. COF-001"
                  value={sku}
                  disabled={isEditing}
                  onChange={(e) => setSku(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-barcode">Barcode (Optional)</Label>
                <Input
                  id="prod-barcode"
                  placeholder="e.g. 8991009000011"
                  value={barcode}
                  disabled={isEditing}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-buy">Purchase Price</Label>
                <Input
                  id="prod-buy"
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-sell">Selling Price</Label>
                <Input
                  id="prod-sell"
                  type="number"
                  min="0"
                  placeholder="50000"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-min">Min Selling Price</Label>
                <Input
                  id="prod-min"
                  type="number"
                  min="0"
                  value={minSellingPrice}
                  onChange={(e) => setMinSellingPrice(e.target.value)}
                  className="font-mono"
                />
              </div>

              {isEditing && (
                <div className="space-y-1.5">
                  <Label htmlFor="prod-reason">Price Change Reason (Optional)</Label>
                  <Input
                    id="prod-reason"
                    placeholder="e.g. Supplier cost update"
                    value={priceChangeReason}
                    onChange={(e) => setPriceChangeReason(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Photo</CardTitle>
              <CardDescription>JPG, PNG, or WEBP up to 4 MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={previewUrl}
                  alt={name || "Product preview"}
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith("/images/products/placeholder.svg")) {
                      e.currentTarget.src = "/images/products/placeholder.svg";
                    }
                  }}
                  className="h-full w-full object-cover"
                />
                {imageFile && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    aria-label="Clear selected photo"
                    onClick={() => setImageFile(null)}
                    className="absolute right-2 top-2 h-7 w-7"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-photo" className="inline-flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" /> Upload Photo
                </Label>
                <Input
                  id="prod-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                {imageFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status &amp; Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Track Inventory</Label>
                  <p className="text-xs text-muted-foreground">Deduct stock on POS sales</p>
                </div>
                <Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Visible in POS terminal</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
