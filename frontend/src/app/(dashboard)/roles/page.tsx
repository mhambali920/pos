"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { RoleItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RolesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleItem[]>("/roles"),
  });

  const roles = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">
          10 default enterprise roles with granular module-level permissions.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-xl bg-muted" />
          <div className="h-36 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Failed to load roles."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{role.name}</CardTitle>
                  <Badge variant="muted">{role.permissions.length} permissions</Badge>
                </div>
                <CardDescription>Guard: {role.guard_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 12).map((perm) => (
                    <Badge key={perm} variant="default">
                      {perm}
                    </Badge>
                  ))}
                  {role.permissions.length > 12 && (
                    <Badge variant="muted">+{role.permissions.length - 12} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
