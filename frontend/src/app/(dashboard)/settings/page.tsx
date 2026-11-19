"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { StoreSummary } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiFetch<StoreSummary[]>("/stores"),
  });

  const stores = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Outlets</h1>
        <p className="text-sm text-muted-foreground">
          Configured outlets, timezones, and inventory policy flags.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stores / Outlets</CardTitle>
          <CardDescription>Outlets accessible by your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-md bg-muted" />
              <div className="h-12 animate-pulse rounded-md bg-muted" />
            </div>
          ) : isError ? (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load stores."}
            </p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores configured.</p>
          ) : (
            <div className="divide-y divide-border">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {store.code} — {store.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Timezone: {store.timezone} {store.address ? `• ${store.address}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={store.allow_negative_stock ? "warning" : "success"}>
                      {store.allow_negative_stock ? "Negative Stock Allowed" : "Strict Stock Guard"}
                    </Badge>
                    <Badge variant="muted">{store.status ?? "active"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
