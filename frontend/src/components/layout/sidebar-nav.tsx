"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
  UserSquare2,
  Wallet,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Point of Sales", href: "/pos", icon: ShoppingCart },
  { label: "Sales", href: "/sales", icon: Receipt },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: FolderTree },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Purchasing", href: "/purchasing", icon: Truck },
  { label: "Suppliers", href: "/suppliers", icon: Store },
  { label: "Customers", href: "/customers", icon: UserSquare2 },
  { label: "Cash Management", href: "/cash-management", icon: Wallet },
  { label: "Expenses", href: "/expenses", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          EP
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">Enterprise POS</span>
          <span className="text-[11px] text-muted-foreground">Retail Operations</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
