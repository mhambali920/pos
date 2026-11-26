"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@eta-ui/react";
import { NAV_GROUPS } from "@/components/layout/sidebar-nav";

interface Crumb {
  label: string;
  href: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  edit: "Edit",
};

function buildCrumbs(pathname: string): Crumb[] {
  const items: Crumb[] = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ label: item.label, href: item.href }))
  );

  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }];
  }

  const match = items
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!match) {
    return [{ label: "Dashboard", href: "/" }];
  }

  const crumbs: Crumb[] = [{ label: match.label, href: match.href }];
  const rest = pathname.slice(match.href.length).split("/").filter(Boolean);

  let href = match.href;
  for (const segment of rest) {
    href = `${href}/${segment}`;
    const label = SEGMENT_LABELS[segment] ?? (/^\d+$/.test(segment) ? `#${segment}` : segment);
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb size="sm">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
