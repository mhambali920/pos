"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SupplierItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () =>
      apiFetch<SupplierItem[]>(
        `/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const suppliers = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor directory, payment terms, and outstanding balances.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : isError ? (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load suppliers."}
            </p>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4 font-medium">Code</th>
                    <th className="py-2.5 pr-4 font-medium">Company</th>
                    <th className="py-2.5 pr-4 font-medium">Contact</th>
                    <th className="py-2.5 pr-4 font-medium">Terms</th>
                    <th className="py-2.5 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 pr-4 font-mono text-xs">{s.code}</td>
                      <td className="py-3 pr-4 font-medium">{s.company_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {s.contact_person ?? "—"} {s.phone ? `(${s.phone})` : ""}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="muted">NET {s.payment_terms_days}</Badge>
                      </td>
                      <td className="py-3 font-medium">{formatCurrency(s.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
