"use client";

import { Clock, RotateCcw } from "lucide-react";
import {
  Alert,
  Button,
  EmptyState,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@eta-ui/react";
import type { SaleSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PosHeldDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heldSales: SaleSummary[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  onResume: (saleId: number) => void;
}

export function PosHeldDrawer({
  open,
  onOpenChange,
  heldSales,
  isLoading,
  isError,
  onRefetch,
  onResume,
}: PosHeldDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-eta-border px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            Held Orders ({heldSales.length})
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pesanan tertahan di outlet ini yang siap dilanjutkan.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div role="status" aria-label="Memuat pesanan tertahan" className="space-y-3">
              <Skeleton variant="rounded" height={60} />
              <Skeleton variant="rounded" height={60} />
              <Skeleton variant="rounded" height={60} />
            </div>
          ) : isError ? (
            <Alert
              status="error"
              variant="soft"
              title="Gagal memuat pesanan tertahan"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={onRefetch}
                >
                  Coba Lagi
                </Button>
              }
            />
          ) : heldSales.length === 0 ? (
            <EmptyState
              size="sm"
              variant="bordered"
              icon={<Clock className="h-5 w-5" aria-hidden="true" />}
              title="Tidak ada pesanan tertahan"
              description="Gunakan tombol Tahan (F4) untuk menyimpan sementara pesanan aktif."
            />
          ) : (
            <ul className="divide-y divide-eta-border">
              {heldSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-eta-heading">
                      {sale.transaction_number}
                    </p>
                    <p className="font-mono text-xs text-eta-muted tabular-nums">
                      {formatCurrency(sale.grand_total)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="solid"
                    color="primary"
                    size="sm"
                    onClick={() => onResume(sale.id)}
                  >
                    Lanjutkan
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
