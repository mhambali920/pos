"use client";

import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@eta-ui/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="h-dvh overflow-hidden bg-eta-shell">
      <Suspense fallback={<div className="hidden h-dvh w-[260px] shrink-0 md:block" />}>
        <SidebarNav />
      </Suspense>
      <SidebarInset className="min-h-0 flex-1 overflow-hidden bg-eta-base md:my-2.5 md:mr-2.5 md:ml-0 md:rounded-2xl md:border md:border-eta-border md:shadow-sm">
        <Topbar />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
