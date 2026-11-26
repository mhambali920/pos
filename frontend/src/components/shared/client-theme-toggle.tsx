"use client";

import { useSyncExternalStore } from "react";
import { ThemeToggle, type ThemeToggleProps, cn } from "@eta-ui/react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientThemeToggle({
  size = "sm",
  variant = "icon",
  className,
  ...props
}: ThemeToggleProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!isMounted) {
    const placeholderSize =
      size === "lg" ? "size-12" : size === "md" ? "size-10" : "size-8";
    return <span aria-hidden="true" className={cn("inline-block shrink-0", placeholderSize, className)} />;
  }

  return <ThemeToggle size={size} variant={variant} className={className} {...props} />;
}
