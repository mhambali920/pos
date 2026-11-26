"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
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
} from "lucide-react";
import {
  Avatar,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@eta-ui/react";
import { useAuthStore } from "@/stores/auth-store";

export const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Point of Sales", href: "/pos", icon: ShoppingCart },
      { label: "Sales", href: "/sales", icon: Receipt },
      { label: "Cash Management", href: "/cash-management", icon: Wallet },
      { label: "Expenses", href: "/expenses", icon: CreditCard },
    ],
  },
  {
    label: "Catalog & Supply",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: FolderTree },
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Purchasing", href: "/purchasing", icon: Truck },
      { label: "Suppliers", href: "/suppliers", icon: Store },
      { label: "Customers", href: "/customers", icon: UserSquare2 },
    ],
  },
  {
    label: "Analytics & Admin",
    items: [
      { label: "Reports & Promos", href: "/reports", icon: BarChart3 },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="max-md:border-r max-md:border-eta-border max-md:bg-eta-surface md:sticky md:top-0 md:h-dvh md:shrink-0 md:py-1.5 md:pl-1.5"
    >
      <SidebarHeader className="flex-col items-stretch gap-2 border-none px-3 pt-3 pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="md" title="Enterprise POS" className="rounded-xl px-2">
              <Link href="/">
                <div className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-eta-primary text-xs font-bold text-eta-inverse">
                  EP
                </div>
                <span className="truncate text-sm font-semibold text-eta-heading">
                  Enterprise POS
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2.5 py-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-2.5 text-[11px] font-medium tracking-wider text-eta-muted/80">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        title={item.label}
                        className="rounded-lg"
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-none px-3 pt-1 pb-3">
        {!isCollapsed ? (
          <div className="flex w-full items-center gap-2.5 rounded-xl bg-eta-base/70 px-2.5 py-2 ring-1 ring-eta-border/60">
            <Avatar name={user?.name ?? "Guest"} size="sm" />
            <div className="min-w-0 flex-1 text-xs leading-tight">
              <div className="truncate font-semibold text-eta-heading">
                {user?.name ?? "Guest"}
              </div>
              <div className="truncate text-eta-muted">
                {user?.roles[0] ?? "Not signed in"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-center">
            <Avatar name={user?.name ?? "Guest"} size="sm" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
