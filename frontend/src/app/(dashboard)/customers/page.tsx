"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CustomerItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customers", search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("customer_type", typeFilter);
      const qs = params.toString();
      return apiFetch<CustomerItem[]>(`/customers${qs ? `?${qs}` : ""}`);
    },
  });

  const customers = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage walk-in, registered, member, and wholesale customers with loyalty & credit limits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter customer type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">All Types</option>
            <option value="walk_in">Walk-in</option>
            <option value="registered">Registered</option>
            <option value="member">Member</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : isError ? (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load customers."}
            </p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4 font-medium">Code</th>
                    <th className="py-2.5 pr-4 font-medium">Name</th>
                    <th className="py-2.5 pr-4 font-medium">Type</th>
                    <th className="py-2.5 pr-4 font-medium">Loyalty</th>
                    <th className="py-2.5 font-medium">Credit Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 font-mono text-xs">{c.code}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge>{c.customer_type}</Badge>
                      </td>
                      <td className="py-3 pr-4">{c.loyalty_points} pts</td>
                      <td className="py-3 font-medium">{formatCurrency(c.credit_limit)}</td>
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
