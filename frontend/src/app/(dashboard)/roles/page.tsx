"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { RoleItem } from "@/lib/types";

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleItem[]>("/roles"),
  });

  const permissionsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: () => apiFetch<string[]>("/permissions"),
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      if (!editingRole) throw new Error("No role selected.");
      return apiFetch(`/roles/${editingRole.id}/permissions`, {
        method: "PUT",
        body: { permissions: selectedPerms },
      });
    },
    onSuccess: () => {
      toast.success("Role permissions updated.");
      setEditingRole(null);
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Update failed."),
  });

  const openEditor = (role: RoleItem) => {
    setEditingRole(role);
    setSelectedPerms(role.permissions);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const roles = rolesQuery.data?.data ?? [];
  const allPermissions = permissionsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-eta-heading">
          Roles &amp; Permissions
        </h1>
        <p className="text-sm text-eta-muted">
          Manage enterprise roles and synchronize granular module permissions.
        </p>
      </div>

      {rolesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton variant="rounded" height={144} />
          <Skeleton variant="rounded" height={144} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>{role.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {role.permissions.length} permissions • Guard: {role.guard_name}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditor(role)}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Edit Permissions
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 12).map((perm) => (
                    <Badge key={perm} variant="soft" color="primary" size="sm">
                      {perm}
                    </Badge>
                  ))}
                  {role.permissions.length > 12 && (
                    <Badge variant="soft" color="neutral" size="sm">
                      +{role.permissions.length - 12} more
                    </Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingRole)} onOpenChange={(o) => !o && setEditingRole(null)}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Edit Permissions — {editingRole?.name}</DialogTitle>
            <DialogDescription>
              Select the permissions assigned to this role ({selectedPerms.length} selected).
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-2 sm:grid-cols-2 max-h-80 overflow-y-auto rounded-lg border border-eta-border p-3">
              {allPermissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    size="sm"
                    checked={selectedPerms.includes(perm)}
                    onCheckedChange={(v) => {
                      if (Boolean(v) !== selectedPerms.includes(perm)) {
                        togglePerm(perm);
                      }
                    }}
                  />
                  <span className="font-mono">{perm}</span>
                </label>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={syncMutation.isPending}
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
