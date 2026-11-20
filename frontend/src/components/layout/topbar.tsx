"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Moon, Store as StoreIcon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import type { NotificationPayload } from "@/lib/types";

export function Topbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />

        {user?.stores && user.stores.length > 0 && (
          <div className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select
              value={activeStoreId !== null ? String(activeStoreId) : ""}
              onValueChange={(val) => {
                if (val) setActiveStoreId(Number(val));
              }}
            >
              <SelectTrigger className="h-8 w-[200px] text-xs">
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
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                />
              }
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px]"
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-auto divide-y divide-border mt-1">
                {notifItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  notifItems.map((n) => (
                    <div key={n.id} className="py-2 text-xs">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-muted-foreground mt-0.5">{n.body}</div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </Button>

        {user && (
          <div className="hidden sm:flex flex-col items-end pr-1">
            <span className="text-xs font-semibold leading-tight">{user.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {user.roles[0] ?? "Staff"}
            </span>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
