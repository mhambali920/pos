"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Power, Search } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  FormLabel,
  IconButton,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser, RoleItem, StoreSummary } from "@/lib/types";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
          <h1 className="text-2xl font-semibold tracking-tight text-eta-heading">Users</h1>
          <p className="text-sm text-eta-muted">
            Manage staff accounts, roles, assigned outlets, and password resets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAdornment={<Search className="h-4 w-4" />}
            wrapperClassName="w-64"
          />
          <Button variant="solid" color="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {usersQuery.isLoading ? (
        <div className="space-y-2.5">
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          variant="bordered"
          size="sm"
          title="No users found."
          description="Try adjusting your search or add a new staff account."
        />
      ) : (
        <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-eta-muted">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="soft" color="primary" size="sm">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="soft"
                    color={u.is_active ? "success" : "neutral"}
                    size="sm"
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="inline-flex items-center gap-1">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      size="sm"
                      variant="ghost"
                      aria-label="Edit user"
                      onClick={() => openEdit(u)}
                    />
                    <IconButton
                      icon={<KeyRound className="h-4 w-4" />}
                      size="sm"
                      variant="ghost"
                      aria-label="Reset password"
                      onClick={() => setResetUser(u)}
                    />
                    <IconButton
                      icon={<Power className="h-4 w-4" />}
                      size="sm"
                      variant="ghost"
                      aria-label="Toggle active status"
                      onClick={() => toggleActiveMutation.mutate(u)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create Staff Account"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Full Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormField>
              {!editing && (
                <FormField label="Password (min 8 chars)">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormField>
              )}
            </div>

            <div className="space-y-1.5">
              <FormLabel>Assign Roles</FormLabel>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-eta-border p-3 max-h-36 overflow-y-auto">
                {(rolesQuery.data?.data ?? []).map((r) => (
                  <Checkbox
                    key={r.id}
                    size="sm"
                    label={r.name}
                    checked={selectedRoles.includes(r.name)}
                    onCheckedChange={(v) => {
                      if (Boolean(v) !== selectedRoles.includes(r.name)) {
                        toggleRole(r.name);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <FormLabel>Assign Stores</FormLabel>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-eta-border p-3 max-h-32 overflow-y-auto">
                {(storesQuery.data?.data ?? []).map((s) => (
                  <Checkbox
                    key={s.id}
                    size="sm"
                    label={`${s.code} — ${s.name}`}
                    checked={selectedStoreIds.includes(s.id)}
                    onCheckedChange={(v) => {
                      if (Boolean(v) !== selectedStoreIds.includes(s.id)) {
                        toggleStore(s.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={saveMutation.isPending}
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reset Password — {resetUser?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <FormField label="New Password (min 8 chars)">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={resetPasswordMutation.isPending}
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
