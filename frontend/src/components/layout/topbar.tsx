"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Store as StoreIcon } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SidebarTrigger,
  useToast,
} from "@eta-ui/react";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { ClientThemeToggle } from "@/components/shared/client-theme-toggle";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import type { NotificationPayload } from "@/lib/types";

const ghostIconClass =
  "relative size-8 rounded-lg border-0 bg-transparent p-0 text-eta-muted shadow-none hover:bg-eta-subtle hover:text-eta-heading";

export function Topbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, activeStoreId, setActiveStoreId, clearSession } = useAuthStore();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationPayload>("/notifications"),
    enabled: Boolean(user),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Clear local session even if backend token already expired.
    } finally {
      clearSession();
      toast.success("Logged out.");
      router.push("/login");
    }
  };

  const unreadCount = notificationsQuery.data?.data?.unread_count ?? 0;
  const notifItems = notificationsQuery.data?.data?.items ?? [];

  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-eta-border/70 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className={`-ml-1 ${ghostIconClass}`} />
        <div className="mx-1 h-4 w-px bg-eta-border" aria-hidden="true" />
        <Suspense fallback={<span className="h-4 w-24 rounded bg-eta-subtle" />}>
          <AppBreadcrumbs />
        </Suspense>
      </div>

      <div className="flex items-center gap-1.5">
        {user?.stores && user.stores.length > 0 && (
          <Select
            value={activeStoreId !== null ? String(activeStoreId) : undefined}
            onValueChange={(val) => {
              if (val) setActiveStoreId(Number(val));
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Active store"
              className="mr-0.5 h-8 w-auto max-w-60 rounded-lg border border-eta-border/60 bg-eta-surface/70 px-2.5 text-xs text-eta-body shadow-none hover:bg-eta-subtle hover:text-eta-heading"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <StoreIcon className="h-3.5 w-3.5 shrink-0 text-eta-muted" />
                <span className="min-w-0 truncate">
                  <SelectValue placeholder="Select store" />
                </span>
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {user.stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.code} — {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {user && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={ghostIconClass} aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-eta-danger px-1 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" size="md" className="w-80 p-0">
              <PopoverHeader className="flex items-center justify-between border-b border-eta-border px-3 py-2.5">
                <PopoverTitle className="text-xs font-semibold">Notifications</PopoverTitle>
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1.5 py-0.5 text-[11px]"
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    Mark all read
                  </Button>
                )}
              </PopoverHeader>
              <PopoverBody className="max-h-64 divide-y divide-eta-border overflow-auto px-3 py-1">
                {notifItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-eta-muted">No notifications yet.</p>
                ) : (
                  notifItems.map((n) => (
                    <div key={n.id} className="py-2 text-xs">
                      <div className="font-medium text-eta-heading">{n.title}</div>
                      <div className="mt-0.5 text-eta-muted">{n.body}</div>
                    </div>
                  ))
                )}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}

        <ClientThemeToggle variant="icon" size="sm" className={ghostIconClass} />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-0.5 size-8 rounded-full border-0 bg-transparent p-0 shadow-none"
                aria-label="User menu"
              >
                <Avatar name={user.name} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left">
                  <Avatar name={user.name} size="sm" />
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-sm font-medium text-eta-heading">{user.name}</span>
                    <span className="truncate text-xs text-eta-muted">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="px-2 pb-1.5">
                <Badge variant="soft" color="neutral" size="sm">
                  {user.roles[0] ?? "Staff"}
                </Badge>
              </div>            
              <DropdownMenuSeparator />
              <DropdownMenuItem color="danger" className="justify-center gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
