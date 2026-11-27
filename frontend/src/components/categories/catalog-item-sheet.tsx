"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormField,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  BrandItem,
  CategoryItem,
  StoreSummary,
  TaxItem,
  UnitItem,
  WarehouseItem,
} from "@/lib/types";

export type CatalogTabKey = "categories" | "brands" | "units" | "taxes" | "warehouses";

export type CatalogEditingItem =
  | { tab: "categories"; item: CategoryItem }
  | { tab: "brands"; item: BrandItem }
  | { tab: "units"; item: UnitItem }
  | { tab: "taxes"; item: TaxItem }
  | { tab: "warehouses"; item: WarehouseItem }
  | null;

const TAB_SINGULAR_LABELS: Record<CatalogTabKey, string> = {
  categories: "Category",
  brands: "Brand",
  units: "Unit",
  taxes: "Tax Rule",
  warehouses: "Warehouse",
};

interface CatalogItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: CatalogTabKey;
  editing: CatalogEditingItem;
  categories: CategoryItem[];
  stores: StoreSummary[];
}

export function CatalogItemSheet({
  open,
  onOpenChange,
  tab,
  editing,
  categories,
  stores,
}: CatalogItemSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editingId = editing?.item.id ?? "new";
  const syncKey = `${open}-${tab}-${editingId}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("none");
  const [isActive, setIsActive] = useState(true);
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [taxRate, setTaxRate] = useState("11");
  const [taxType, setTaxType] = useState<"exclusive" | "inclusive">("exclusive");
  const [storeId, setStoreId] = useState("none");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [warehouseStatus, setWarehouseStatus] = useState<"active" | "inactive">("active");

  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      if (editing) {
        setCode(editing.item.code);
        setName(editing.item.name);
        if (editing.tab === "categories") {
          setSlug(editing.item.slug);
          setParentId(editing.item.parent_id ? String(editing.item.parent_id) : "none");
          setIsActive(editing.item.is_active);
        } else if (editing.tab === "brands") {
          setIsActive(editing.item.is_active);
        } else if (editing.tab === "units") {
          setAllowDecimal(editing.item.allow_decimal);
        } else if (editing.tab === "taxes") {
          setTaxRate(String(Number(editing.item.rate)));
          setTaxType(editing.item.type);
          setIsActive(editing.item.is_active);
        } else if (editing.tab === "warehouses") {
          setStoreId(editing.item.store_id ? String(editing.item.store_id) : "none");
          setAddress(editing.item.address ?? "");
          setIsDefault(editing.item.is_default);
          setWarehouseStatus(editing.item.status === "inactive" ? "inactive" : "active");
        }
      } else {
        setCode("");
        setName("");
        setSlug("");
        setParentId("none");
        setIsActive(true);
        setAllowDecimal(false);
        setTaxRate("11");
        setTaxType("exclusive");
        setStoreId("none");
        setAddress("");
        setIsDefault(false);
        setWarehouseStatus("active");
      }
    }
  }

  const isEditing = Boolean(editing);
  const singularLabel = TAB_SINGULAR_LABELS[tab];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedCode = code.trim();
      const trimmedName = name.trim();

      if (tab === "categories") {
        const body = {
          ...(isEditing ? {} : { code: trimmedCode }),
          name: trimmedName,
          parent_id: parentId === "none" ? null : Number(parentId),
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          is_active: isActive,
        };
        return isEditing && editing
          ? apiFetch(`/categories/${editing.item.id}`, { method: "PUT", body })
          : apiFetch("/categories", { method: "POST", body });
      }

      if (tab === "brands") {
        const body = {
          ...(isEditing ? {} : { code: trimmedCode }),
          name: trimmedName,
          is_active: isActive,
        };
        return isEditing && editing
          ? apiFetch(`/brands/${editing.item.id}`, { method: "PUT", body })
          : apiFetch("/brands", { method: "POST", body });
      }

      if (tab === "units") {
        const body = {
          ...(isEditing ? {} : { code: trimmedCode }),
          name: trimmedName,
          allow_decimal: allowDecimal,
        };
        return isEditing && editing
          ? apiFetch(`/units/${editing.item.id}`, { method: "PUT", body })
          : apiFetch("/units", { method: "POST", body });
      }

      if (tab === "taxes") {
        const body = {
          ...(isEditing ? {} : { code: trimmedCode }),
          name: trimmedName,
          rate: Number(taxRate),
          type: taxType,
          is_active: isActive,
        };
        return isEditing && editing
          ? apiFetch(`/taxes/${editing.item.id}`, { method: "PUT", body })
          : apiFetch("/taxes", { method: "POST", body });
      }

      const warehouseBody = isEditing
        ? {
            name: trimmedName,
            address: address.trim() || null,
            is_default: isDefault,
            status: warehouseStatus,
          }
        : {
            code: trimmedCode,
            name: trimmedName,
            store_id: storeId === "none" ? null : Number(storeId),
            address: address.trim() || null,
            is_default: isDefault,
            status: warehouseStatus,
          };

      return isEditing && editing
        ? apiFetch(`/warehouses/${editing.item.id}`, { method: "PUT", body: warehouseBody })
        : apiFetch("/warehouses", { method: "POST", body: warehouseBody });
    },
    onSuccess: () => {
      toast.success(
        isEditing ? `${singularLabel} updated successfully.` : `${singularLabel} created successfully.`
      );
      void queryClient.invalidateQueries({ queryKey: [tab] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : `Failed to save ${singularLabel.toLowerCase()}.`);
    },
  });

  const parentOptions = categories.filter((c) => !editing || c.id !== editing.item.id);
  const canSubmit =
    Boolean(name.trim()) &&
    (isEditing || Boolean(code.trim())) &&
    (tab !== "taxes" || (taxRate !== "" && !Number.isNaN(Number(taxRate)) && Number(taxRate) >= 0 && Number(taxRate) <= 100));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? `Edit ${singularLabel}` : `Add ${singularLabel}`}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update ${singularLabel.toLowerCase()} details and configuration.`
              : `Create a new ${singularLabel.toLowerCase()} record for your organization.`}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit || saveMutation.isPending) return;
            saveMutation.mutate();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetBody className="space-y-4">
            <FormField
              label="Code"
              isRequired={!isEditing}
              helperText={isEditing ? "Code cannot be changed after creation." : undefined}
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEditing}
                placeholder="CODE-01"
                className="font-mono"
              />
            </FormField>

            <FormField label="Name" isRequired>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${singularLabel.toLowerCase()} name`}
              />
            </FormField>

            {tab === "categories" && (
              <>
                <FormField label="Parent Category">
                  <Select value={parentId} onValueChange={(v) => setParentId(v || "none")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No Parent (Root Category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Root)</SelectItem>
                      {parentOptions.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.code} — {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Slug"
                  optionalText="Optional"
                  helperText="Leave blank to auto-generate from name when creating."
                >
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated-slug"
                    className="font-mono text-xs"
                  />
                </FormField>

                <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
                  <div>
                    <FormLabel htmlFor="cat-active">Active Status</FormLabel>
                    <p className="text-xs text-eta-muted">
                      Inactive categories are hidden from new product forms.
                    </p>
                  </div>
                  <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </>
            )}

            {tab === "brands" && (
              <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
                <div>
                  <FormLabel htmlFor="brand-active">Active Status</FormLabel>
                  <p className="text-xs text-eta-muted">
                    Toggle whether this brand is active in the catalog.
                  </p>
                </div>
                <Switch id="brand-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}

            {tab === "units" && (
              <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
                <div>
                  <FormLabel htmlFor="unit-decimal">Allow Decimal Quantities</FormLabel>
                  <p className="text-xs text-eta-muted">
                    Enable fractional quantities (e.g. 0.5 kg or 1.25 L) during sales and stock counts.
                  </p>
                </div>
                <Switch
                  id="unit-decimal"
                  checked={allowDecimal}
                  onCheckedChange={setAllowDecimal}
                />
              </div>
            )}

            {tab === "taxes" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Rate (%)" isRequired>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="font-mono"
                    />
                  </FormField>

                  <FormField label="Calculation Type" isRequired>
                    <Select
                      value={taxType}
                      onValueChange={(v) =>
                        setTaxType((v as "exclusive" | "inclusive") || "exclusive")
                      }
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
                </div>

                <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
                  <div>
                    <FormLabel htmlFor="tax-active">Active Status</FormLabel>
                    <p className="text-xs text-eta-muted">
                      Inactive tax rules cannot be applied to new transactions.
                    </p>
                  </div>
                  <Switch id="tax-active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </>
            )}

            {tab === "warehouses" && (
              <>
                <FormField
                  label="Assigned Outlet / Store"
                  helperText={
                    isEditing
                      ? "Store assignment is fixed when the warehouse is created."
                      : "Optional. Leave as Central Warehouse if shared across outlets."
                  }
                >
                  <Select
                    value={storeId}
                    onValueChange={(v) => setStoreId(v || "none")}
                    disabled={isEditing}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Central / All Outlets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Central / All Outlets</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.code} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Address" optionalText="Optional">
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Warehouse street address or location notes"
                    rows={3}
                  />
                </FormField>

                <FormField label="Status">
                  <Select
                    value={warehouseStatus}
                    onValueChange={(v) =>
                      setWarehouseStatus((v as "active" | "inactive") || "active")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
                  <div>
                    <FormLabel htmlFor="wh-default">Default Warehouse</FormLabel>
                    <p className="text-xs text-eta-muted">
                      Used automatically for POS stock deductions and purchasing receipts.
                    </p>
                  </div>
                  <Switch id="wh-default" checked={isDefault} onCheckedChange={setIsDefault} />
                </div>
              </>
            )}
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              color="primary"
              isLoading={saveMutation.isPending}
              disabled={!canSubmit || saveMutation.isPending}
            >
              {isEditing ? "Save Changes" : `Create ${singularLabel}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
