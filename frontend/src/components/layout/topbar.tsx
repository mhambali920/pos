"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Moon, Store as StoreIcon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import type { NotificationPayload } from "@/lib/types";

export function Topbar({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, activeStoreId, setActiveStoreId, clearSession } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

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
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {user?.stores && user.stores.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5">
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
            <select
              aria-label="Active store"
              value={activeStoreId ?? ""}
              onChange={(e) => setActiveStoreId(Number(e.target.value))}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
            >
              {user.stores.map((store) => (
                <option key={store.id} value={store.id} className="bg-card text-foreground">
                  {store.code} — {store.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-lg z-40">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
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
              </div>
            )}
          </div>
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
          <div className="hidden sm:flex flex-col items-end pr-2">
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
