"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Settings, Store as StoreIcon } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Divider,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ThemeToggle,
  useToast,
} from "@eta-ui/react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import type { NotificationPayload } from "@/lib/types";

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
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-eta-border bg-eta-surface px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Divider orientation="vertical" spacing="sm" className="h-4" />

        {user?.stores && user.stores.length > 0 && (
          <div className="flex items-center gap-2">
            <StoreIcon className="hidden h-4 w-4 text-eta-muted sm:block" />
            <Select
              value={activeStoreId !== null ? String(activeStoreId) : undefined}
              onValueChange={(val) => {
                if (val) setActiveStoreId(Number(val));
              }}
            >
              <SelectTrigger size="sm" className="w-[210px] text-xs">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {user.stores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.code} — {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 p-0"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-eta-danger px-1 text-[10px] font-bold text-white">
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
              <PopoverBody className="max-h-64 overflow-auto divide-y divide-eta-border px-3 py-1">
                {notifItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-eta-muted">
                    No notifications yet.
                  </p>
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

        <ThemeToggle variant="icon" size="sm" />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0"
                aria-label="User menu"
              >
                <Avatar name={user.name} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <Avatar name={user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight text-eta-heading">
                    {user.name}
                  </div>
                  <div className="truncate text-xs text-eta-muted">{user.email}</div>
                  <Badge variant="soft" color="neutral" size="sm" className="mt-1">
                    {user.roles[0] ?? "Staff"}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem color="danger" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
