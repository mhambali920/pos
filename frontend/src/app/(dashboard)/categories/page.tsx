"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Heading,
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
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { BrandItem, CategoryItem, TaxItem, UnitItem, WarehouseItem } from "@/lib/types";

type TabKey = "categories" | "brands" | "units" | "taxes" | "warehouses";

export default function CategoriesAndCatalogConfigPage() {
  const { toast } = useToast();
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

  const isLoading =
    (tab === "categories" && categoriesQuery.isLoading) ||
    (tab === "brands" && brandsQuery.isLoading) ||
    (tab === "units" && unitsQuery.isLoading) ||
    (tab === "taxes" && taxesQuery.isLoading) ||
    (tab === "warehouses" && warehousesQuery.isLoading);

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" size="xl" weight="semibold">
          Catalog Setup
        </Heading>
        <Text size="sm" variant="muted" className="mt-0.5">
          Manage product categories, brands, units of measurement, taxes, and warehouses.
        </Text>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} variant="underline">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card variant="elevated" padding="md">
        <CardHeader>
          <CardTitle className="capitalize">Quick Create ({tab})</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!code.trim() || !name.trim()) return;
              createMutation.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <FormField label="Code" className="w-36">
              <Input
                id="catalog-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CODE-01"
              />
            </FormField>
            <FormField label="Name" className="min-w-52 flex-1">
              <Input
                id="catalog-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
              />
            </FormField>
            {tab === "taxes" && (
              <>
                <FormField label="Rate (%)" className="w-28">
                  <Input
                    id="tax-rate"
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </FormField>
                <FormField label="Type" className="w-36">
                  <Select
                    value={taxType}
                    onValueChange={(v) => setTaxType((v as "exclusive" | "inclusive") ?? "exclusive")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Exclusive</SelectItem>
                      <SelectItem value="inclusive">Inclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </>
            )}
            <Button
              type="submit"
              variant="solid"
              color="primary"
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add
            </Button>
          </form>
        </CardBody>
      </Card>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
        </div>
      ) : tab === "categories" ? (
        (categoriesQuery.data?.data ?? []).length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No categories yet"
            description="Create your first product category using the form above."
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead align="right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categoriesQuery.data?.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-eta-muted">
                    {item.parent ? item.parent.name : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Badge variant="soft" color={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "brands" ? (
        (brandsQuery.data?.data ?? []).length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No brands yet"
            description="Create your first product brand using the form above."
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead align="right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(brandsQuery.data?.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell align="right">
                    <Badge variant="soft" color={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "units" ? (
        (unitsQuery.data?.data ?? []).length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No units yet"
            description="Create your first unit of measurement using the form above."
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead align="right">Precision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(unitsQuery.data?.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell align="right">
                    <Badge variant="soft" color="neutral">
                      {item.allow_decimal ? "Decimal" : "Integer"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : tab === "taxes" ? (
        (taxesQuery.data?.data ?? []).length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No taxes yet"
            description="Create your first tax rule using the form above."
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead align="right">Rate &amp; Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(taxesQuery.data?.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-eta-muted">
                    {item.code}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell align="right">
                    <div className="inline-flex items-center gap-2">
                      <Badge variant="solid" color="primary">
                        {Number(item.rate)}%
                      </Badge>
                      <Badge variant="soft" color="neutral">
                        {item.type}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (warehousesQuery.data?.data ?? []).length === 0 ? (
        <EmptyState
          variant="bordered"
          size="sm"
          title="No warehouses yet"
          description="Create your first warehouse using the form above."
        />
      ) : (
        <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Store</TableHead>
              <TableHead align="right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(warehousesQuery.data?.data ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-eta-muted">
                  {item.code}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-eta-muted">
                  {item.store ? item.store.name : "—"}
                </TableCell>
                <TableCell align="right">
                  <Badge variant="soft" color={item.is_default ? "success" : "neutral"}>
                    {item.is_default ? "Default" : item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
