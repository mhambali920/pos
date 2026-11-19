"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Store as StoreIcon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";

export function Topbar({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, activeStoreId, setActiveStoreId, clearSession } = useAuthStore();

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
