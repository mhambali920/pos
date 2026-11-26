"use client";

import { Printer } from "lucide-react";
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SegmentedControl,
  SegmentedControlItem,
} from "@eta-ui/react";
import { printThermalReceipt } from "@/lib/print-receipt";
import type { ReceiptPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PosReceiptDialogProps {
  receipt: ReceiptPayload | null;
  onClose: () => void;
  paperSize: "58mm" | "80mm";
  onPaperSizeChange: (size: "58mm" | "80mm") => void;
}

export function PosReceiptDialog({
  receipt,
  onClose,
  paperSize,
  onPaperSizeChange,
}: PosReceiptDialogProps) {
  return (
    <Dialog
      open={receipt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="md">
        {receipt && (
          <>
            <DialogHeader>
              <DialogTitle>Struk Transaksi</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {receipt.transaction_number}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <Alert
                status="success"
                variant="soft"
                title="Lunas · Kembalian"
                description={
                  <span className="font-mono text-xl font-bold tabular-nums">
                    {formatCurrency(receipt.change_amount)}
                  </span>
                }
              />

              <pre className="max-h-80 overflow-auto rounded-md border border-eta-border bg-eta-subtle/50 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-eta-heading">
                {receipt.thermal_text}
              </pre>
            </DialogBody>

            <DialogFooter className="flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                type="single"
                variant="segmented"
                size="sm"
                aria-label="Ukuran kertas struk"
                value={paperSize}
                onValueChange={(value) => {
                  if (value === "58mm" || value === "80mm") {
                    onPaperSizeChange(value);
                  }
                }}
              >
                <SegmentedControlItem value="58mm" className="font-mono">
                  58mm
                </SegmentedControlItem>
                <SegmentedControlItem value="80mm" className="font-mono">
                  80mm
                </SegmentedControlItem>
              </SegmentedControl>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
                  onClick={() =>
                    printThermalReceipt(
                      receipt.thermal_text,
                      paperSize,
                      receipt.transaction_number
                    )
                  }
                >
                  Cetak
                </Button>
                <Button type="button" variant="solid" color="primary" onClick={onClose}>
                  Transaksi Baru
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
