"use client";

import Link from "next/link";
import { ShieldCheck, Store, Users, Settings, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardHomePage() {
  const { user, activeStoreId } = useAuthStore();
  const activeStore = user?.stores?.find((s) => s.id === activeStoreId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {activeStore
              ? `Active Outlet: ${activeStore.code} — ${activeStore.name} (${activeStore.timezone})`
              : "Enterprise POS Foundation Console"}
          </p>
        </div>

        {!user && (
          <Link href="/login">
            <Button size="sm">
              Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Identity & Access
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10 Roles</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sanctum + Spatie RBAC active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Multi-Store Isolation
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enforced</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scoped via X-Store-Id & Policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit Trail
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Append-Only</div>
            <p className="text-xs text-muted-foreground mt-1">
              Immutable governance logging
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Phase
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">Phase 1</span>
              <Badge variant="success">Foundation</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next: Phase 2 Master Data
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Access — Foundation Modules</CardTitle>
          <CardDescription>
            Manage users, roles, permissions, and outlet settings connected to Laravel `/api/v1`.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/users">
            <Button variant="outline">Manage Users</Button>
          </Link>
          <Link href="/roles">
            <Button variant="outline">Roles & Permissions</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">Store & System Settings</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
