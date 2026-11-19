"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { BrandItem, CategoryItem, TaxItem, UnitItem, WarehouseItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type TabKey = "categories" | "brands" | "units" | "taxes" | "warehouses";

export default function CategoriesAndCatalogConfigPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("categories");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [taxRate, setTaxRate] = useState("11");
  const [taxType, setTaxType] = useState<"exclusive" | "inclusive">("exclusive");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryItem[]>("/categories"),
    enabled: tab === "categories",
  });

  const brandsQuery = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetch<BrandItem[]>("/brands"),
    enabled: tab === "brands",
  });

  const unitsQuery = useQuery({
    queryKey: ["units"],
    queryFn: () => apiFetch<UnitItem[]>("/units"),
    enabled: tab === "units",
  });

  const taxesQuery = useQuery({
    queryKey: ["taxes"],
    queryFn: () => apiFetch<TaxItem[]>("/taxes"),
    enabled: tab === "taxes",
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<WarehouseItem[]>("/warehouses"),
    enabled: tab === "warehouses",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (tab === "taxes") {
        return apiFetch("/taxes", {
          method: "POST",
          body: { code, name, rate: Number(taxRate), type: taxType },
        });
      }
      return apiFetch(`/${tab}`, {
        method: "POST",
        body: { code, name },
      });
    },
    onSuccess: () => {
      toast.success("Record created successfully.");
      setCode("");
      setName("");
      void queryClient.invalidateQueries({ queryKey: [tab] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to create record.");
    },
  });

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "categories", label: "Categories" },
    { key: "brands", label: "Brands" },
    { key: "units", label: "Units" },
    { key: "taxes", label: "Taxes" },
    { key: "warehouses", label: "Warehouses" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog Setup</h1>
        <p className="text-sm text-muted-foreground">
          Manage product categories, brands, units of measurement, taxes, and warehouses.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Create ({tab})</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!code.trim() || !name.trim()) return;
              createMutation.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="w-36 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE-01" />
            </div>
            <div className="min-w-52 flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
            </div>
            {tab === "taxes" && (
              <>
                <div className="w-28 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="w-36 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as "exclusive" | "inclusive")}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                  </select>
                </div>
              </>
            )}
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{tab}</CardTitle>
        </CardHeader>
        <CardContent>
          {tab === "categories" && (
            <div className="divide-y divide-border">
              {(categoriesQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.parent && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Parent: {item.parent.name})
                      </span>
                    )}
                  </div>
                  <Badge variant={item.is_active ? "success" : "muted"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
              {!categoriesQuery.isLoading && (categoriesQuery.data?.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              )}
            </div>
          )}

          {tab === "brands" && (
            <div className="divide-y divide-border">
              {(brandsQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Badge variant={item.is_active ? "success" : "muted"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
              {!brandsQuery.isLoading && (brandsQuery.data?.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No brands yet.</p>
              )}
            </div>
          )}

          {tab === "units" && (
            <div className="divide-y divide-border">
              {(unitsQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Badge variant="muted">{item.allow_decimal ? "Decimal" : "Integer"}</Badge>
                </div>
              ))}
            </div>
          )}

          {tab === "taxes" && (
            <div className="divide-y divide-border">
              {(taxesQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{Number(item.rate)}%</Badge>
                    <Badge variant="muted">{item.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "warehouses" && (
            <div className="divide-y divide-border">
              {(warehousesQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.store && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({item.store.name})
                      </span>
                    )}
                  </div>
                  <Badge variant={item.is_default ? "success" : "muted"}>
                    {item.is_default ? "Default" : item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
