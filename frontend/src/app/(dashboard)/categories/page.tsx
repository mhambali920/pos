"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Heading,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from "@eta-ui/react";
import {
  CatalogItemSheet,
  type CatalogEditingItem,
  type CatalogTabKey,
} from "@/components/categories/catalog-item-sheet";
import { apiFetch } from "@/lib/api";
import type {
  BrandItem,
  CategoryItem,
  StoreSummary,
  TaxItem,
  UnitItem,
  WarehouseItem,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

const TABS: Array<{ key: CatalogTabKey; label: string; addLabel: string }> = [
  { key: "categories", label: "Categories", addLabel: "Add Category" },
  { key: "brands", label: "Brands", addLabel: "Add Brand" },
  { key: "units", label: "Units", addLabel: "Add Unit" },
  { key: "taxes", label: "Taxes", addLabel: "Add Tax Rule" },
  { key: "warehouses", label: "Warehouses", addLabel: "Add Warehouse" },
];

export default function CategoriesAndCatalogConfigPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<CatalogTabKey>("categories");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogEditingItem>(null);

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

  const storesQuery = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiFetch<StoreSummary[]>("/stores"),
    enabled: tab === "warehouses",
    retry: false,
  });

  const activeTabMeta = TABS.find((t) => t.key === tab) ?? TABS[0];

  const openCreateSheet = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEditSheet = (target: CatalogEditingItem) => {
    setEditing(target);
    setSheetOpen(true);
  };

  const isLoading =
    (tab === "categories" && categoriesQuery.isLoading) ||
    (tab === "brands" && brandsQuery.isLoading) ||
    (tab === "units" && unitsQuery.isLoading) ||
    (tab === "taxes" && taxesQuery.isLoading) ||
    (tab === "warehouses" && warehousesQuery.isLoading);

  const categories = categoriesQuery.data?.data ?? [];
  const brands = brandsQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const taxes = taxesQuery.data?.data ?? [];
  const warehouses = warehousesQuery.data?.data ?? [];
  const stores = storesQuery.data?.data ?? user?.stores ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Catalog Setup
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Manage product categories, brands, units of measurement, taxes, and warehouses.
          </Text>
        </div>

        <Button
          variant="solid"
          color="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreateSheet}
        >
          {activeTabMeta.addLabel}
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as CatalogTabKey);
          setSheetOpen(false);
          setEditing(null);
        }}
        variant="underline"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
        </div>
      ) : tab === "categories" ? (
        categories.length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No categories yet"
            description="Create your first product category."
            action={
              <Button variant="solid" color="primary" size="sm" onClick={openCreateSheet}>
                {activeTabMeta.addLabel}
              </Button>
            }
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-eta-muted">
                    {item.parent ? item.parent.name : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="soft" color={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit category ${item.name}`}
                      onClick={() => openEditSheet({ tab: "categories", item })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "brands" ? (
        brands.length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No brands yet"
            description="Create your first product brand."
            action={
              <Button variant="solid" color="primary" size="sm" onClick={openCreateSheet}>
                {activeTabMeta.addLabel}
              </Button>
            }
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="soft" color={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit brand ${item.name}`}
                      onClick={() => openEditSheet({ tab: "brands", item })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "units" ? (
        units.length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No units yet"
            description="Create your first unit of measurement."
            action={
              <Button variant="solid" color="primary" size="sm" onClick={openCreateSheet}>
                {activeTabMeta.addLabel}
              </Button>
            }
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="soft" color="neutral">
                      {item.allow_decimal ? "Decimal" : "Integer"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit unit ${item.name}`}
                      onClick={() => openEditSheet({ tab: "units", item })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "taxes" ? (
        taxes.length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No taxes yet"
            description="Create your first tax rule."
            action={
              <Button variant="solid" color="primary" size="sm" onClick={openCreateSheet}>
                {activeTabMeta.addLabel}
              </Button>
            }
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rate &amp; Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <Badge variant="solid" color="primary">
                        {Number(item.rate)}%
                      </Badge>
                      <Badge variant="soft" color="neutral">
                        {item.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="soft" color={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit tax ${item.name}`}
                      onClick={() => openEditSheet({ tab: "taxes", item })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : warehouses.length === 0 ? (
        <EmptyState
          variant="bordered"
          size="sm"
          title="No warehouses yet"
          description="Create your first warehouse."
          action={
            <Button variant="solid" color="primary" size="sm" onClick={openCreateSheet}>
              {activeTabMeta.addLabel}
            </Button>
          }
        />
      ) : (
        <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-eta-muted">
                  {item.code}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-eta-heading">{item.name}</div>
                  {item.address && (
                    <div className="text-xs text-eta-muted">{item.address}</div>
                  )}
                </TableCell>
                <TableCell className="text-eta-muted">
                  {item.store ? item.store.name : "Central / All"}
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5">
                    {item.is_default && (
                      <Badge variant="soft" color="primary">
                        Default
                      </Badge>
                    )}
                    <Badge
                      variant="soft"
                      color={item.status === "active" ? "success" : "neutral"}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    icon={<Pencil className="h-4 w-4" />}
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit warehouse ${item.name}`}
                    onClick={() => openEditSheet({ tab: "warehouses", item })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CatalogItemSheet
        open={sheetOpen}
        onOpenChange={(nextOpen) => {
          setSheetOpen(nextOpen);
          if (!nextOpen) setEditing(null);
        }}
        tab={tab}
        editing={editing}
        categories={categories}
        stores={stores}
      />
    </div>
  );
}
