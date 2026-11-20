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
  SidebarRail,
} from "@/components/ui/sidebar";
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                EP
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Enterprise POS</span>
                <span className="truncate text-xs text-muted-foreground">Retail Operations</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="font-medium text-sidebar-foreground truncate">
            {user?.name ?? "Guest"}
          </div>
          <div className="truncate">{user?.roles[0] ?? "Not signed in"}</div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
