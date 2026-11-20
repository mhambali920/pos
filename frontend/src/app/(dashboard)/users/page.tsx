"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser, RoleItem, StoreSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);

  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", search],
    queryFn: () =>
      apiFetch<AuthUser[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleItem[]>("/roles"),
  });

  const storesQuery = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiFetch<StoreSummary[]>("/stores"),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSelectedRoles(["Cashier"]);
    setSelectedStoreIds(storesQuery.data?.data[0] ? [storesQuery.data.data[0].id] : []);
    setDialogOpen(true);
  };

  const openEdit = (u: AuthUser) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone ?? "");
    setPassword("");
    setSelectedRoles(u.roles);
    setSelectedStoreIds((u.stores ?? []).map((s) => s.id));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return apiFetch(`/users/${editing.id}`, {
          method: "PUT",
          body: {
            name: name.trim(),
            email: email.trim(),
            phone: phone || null,
            roles: selectedRoles,
            store_ids: selectedStoreIds,
          },
        });
      }
      return apiFetch("/users", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone || null,
          password,
          roles: selectedRoles,
          store_ids: selectedStoreIds,
        },
      });
    },
    onSuccess: () => {
      toast.success(editing ? "User updated." : "User created.");
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save user."),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (u: AuthUser) =>
      apiFetch(`/users/${u.id}/${u.is_active ? "deactivate" : "activate"}`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("User status updated.");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Action failed."),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => {
      if (!resetUser) throw new Error("No user selected.");
      return apiFetch(`/users/${resetUser.id}/reset-password`, {
        method: "POST",
        body: { password: newPassword, password_confirmation: newPassword },
      });
    },
    onSuccess: () => {
      toast.success("Password reset successfully.");
      setResetUser(null);
      setNewPassword("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Reset failed."),
  });

  const users = usersQuery.data?.data ?? [];

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  const toggleStore = (storeId: number) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts, roles, assigned outlets, and password resets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r}>{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "muted"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit user"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Reset password"
                          onClick={() => setResetUser(u)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Toggle active status"
                          onClick={() => toggleActiveMutation.mutate(u)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create Staff Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label>Password (min 8 chars)</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Assign Roles</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 max-h-36 overflow-y-auto">
                {(rolesQuery.data?.data ?? []).map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedRoles.includes(r.name)}
                      onCheckedChange={() => toggleRole(r.name)}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assign Stores</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 max-h-32 overflow-y-auto">
                {(storesQuery.data?.data ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedStoreIds.includes(s.id)}
                      onCheckedChange={() => toggleStore(s.id)}
                    />
                    <span>
                      {s.code} — {s.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                saveMutation.isPending || !name.trim() || !email.trim() || (!editing && password.length < 8)
              }
              onClick={() => saveMutation.mutate()}
            >
              {editing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetUser)} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {resetUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New Password (min 8 chars)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              onClick={() => resetPasswordMutation.mutate()}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
