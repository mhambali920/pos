"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  CashRegister,
  CashRegisterSession,
  CurrentRegisterPayload,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CashManagementPage() {
  const queryClient = useQueryClient();

  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("500000");

  const [movementType, setMovementType] = useState<"cash-in" | "cash-out">("cash-in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const registersQuery = useQuery({
    queryKey: ["cash-registers"],
    queryFn: () => apiFetch<CashRegister[]>("/cash-register/registers"),
  });

  const currentQuery = useQuery({
    queryKey: ["cash-register-current"],
    queryFn: () => apiFetch<CurrentRegisterPayload | null>("/cash-register/current"),
  });

  const sessionsQuery = useQuery({
    queryKey: ["cash-register-sessions"],
    queryFn: () => apiFetch<CashRegisterSession[]>("/cash-register/sessions"),
  });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["cash-register-current"] });
    void queryClient.invalidateQueries({ queryKey: ["cash-register-sessions"] });
  };

  const openMutation = useMutation({
    mutationFn: () =>
      apiFetch<CurrentRegisterPayload>("/cash-register/open", {
        method: "POST",
        body: {
          cash_register_id: Number(selectedRegisterId || registersQuery.data?.data[0]?.id),
          opening_balance: openingBalance || "0",
        },
      }),
    onSuccess: () => {
      toast.success("Cash register session opened.");
      refreshAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to open register."),
  });

  const movementMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/cash-register/${movementType}`, {
        method: "POST",
        body: {
          amount: movementAmount,
          reason: movementReason,
        },
      }),
    onSuccess: () => {
      toast.success(movementType === "cash-in" ? "Cash In recorded." : "Cash Out recorded.");
      setMovementAmount("");
      setMovementReason("");
      refreshAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to record cash movement."),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      apiFetch("/cash-register/close", {
        method: "POST",
        body: {
          actual_cash: actualCash,
          closing_notes: closingNotes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Cash register closed and reconciled.");
      setActualCash("");
      setClosingNotes("");
      refreshAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to close register."),
  });

  const current = currentQuery.data?.data ?? null;
  const registers = registersQuery.data?.data ?? [];
  const sessions = sessionsQuery.data?.data ?? [];

  const liveDiff =
    current && actualCash !== "" && !Number.isNaN(Number(actualCash))
      ? Number(actualCash) - Number(current.summary.expected_cash)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage cashier register shifts, cash in/out movements, and end-of-shift reconciliation.
        </p>
      </div>

      {currentQuery.isLoading ? (
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
      ) : current ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-emerald-600" />
                  Active Session — {current.session.register?.name ?? `Register #${current.session.cash_register_id}`}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Cashier: {current.session.user?.name ?? "Current User"} • Opened{" "}
                  {new Date(current.session.opened_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="success">OPEN</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Opening Balance</div>
                  <div className="mt-1 text-lg font-semibold font-mono">
                    {formatCurrency(current.summary.opening_balance)}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Cash Sales</div>
                  <div className="mt-1 text-lg font-semibold font-mono text-emerald-600">
                    +{formatCurrency(current.summary.cash_sales)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-primary/5 p-3">
                  <div className="text-xs text-muted-foreground">Expected Cash</div>
                  <div className="mt-1 text-lg font-bold font-mono">
                    {formatCurrency(current.summary.expected_cash)}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-muted/60 p-2.5">
                  <span className="text-muted-foreground">Cash In:</span>{" "}
                  <span className="font-mono font-medium">+{formatCurrency(current.summary.cash_in)}</span>
                </div>
                <div className="rounded-md bg-muted/60 p-2.5">
                  <span className="text-muted-foreground">Cash Out:</span>{" "}
                  <span className="font-mono font-medium">-{formatCurrency(current.summary.cash_out)}</span>
                </div>
                <div className="rounded-md bg-muted/60 p-2.5">
                  <span className="text-muted-foreground">Cash Refunds:</span>{" "}
                  <span className="font-mono font-medium">-{formatCurrency(current.summary.cash_refund)}</span>
                </div>
                <div className="rounded-md bg-muted/60 p-2.5">
                  <span className="text-muted-foreground">Cash Expenses:</span>{" "}
                  <span className="font-mono font-medium">-{formatCurrency(current.summary.cash_expense)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-3">Record Cash Movement</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={movementType === "cash-in" ? "default" : "outline"}
                      onClick={() => setMovementType("cash-in")}
                    >
                      <ArrowDownCircle className="h-3.5 w-3.5" /> Cash In
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={movementType === "cash-out" ? "default" : "outline"}
                      onClick={() => setMovementType("cash-out")}
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Cash Out
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="sm:w-36"
                  />
                  <Input
                    placeholder="Reason (e.g. Safe drop, extra change)"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    disabled={movementMutation.isPending || !movementAmount || !movementReason}
                    onClick={() => movementMutation.mutate()}
                  >
                    Record
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Close & Reconcile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Actual Cash Counted
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter counted drawer cash"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>

              {liveDiff !== null && (
                <div className="rounded-lg border border-border p-3 text-xs">
                  <div className="text-muted-foreground">Estimated Variance</div>
                  <div
                    className={`mt-1 font-mono text-sm font-semibold ${
                      liveDiff === 0
                        ? "text-emerald-600"
                        : liveDiff > 0
                          ? "text-amber-600"
                          : "text-destructive"
                    }`}
                  >
                    {liveDiff > 0 ? "+" : ""}
                    {formatCurrency(liveDiff)} (
                    {liveDiff === 0 ? "Balanced" : liveDiff > 0 ? "Overage" : "Shortage"})
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Closing Notes</label>
                <Input
                  placeholder="Optional shift notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button
                className="w-full"
                variant="destructive"
                disabled={closeMutation.isPending || actualCash === ""}
                onClick={() => closeMutation.mutate()}
              >
                Close Register Session
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Open Cash Register Session
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Cash Register</label>
              <select
                aria-label="Select cash register"
                value={selectedRegisterId || String(registers[0]?.id ?? "")}
                onChange={(e) => setSelectedRegisterId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              >
                {registers.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.code} — {reg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-52">
              <label className="text-xs font-medium text-muted-foreground">Opening Balance</label>
              <Input
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <Button
              disabled={openMutation.isPending || registers.length === 0}
              onClick={() => openMutation.mutate()}
            >
              Open Register
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cash register sessions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => {
                const diff = session.cash_difference ? Number(session.cash_difference) : 0;
                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {session.register?.name ?? `Register #${session.cash_register_id}`} •{" "}
                        {session.user?.name ?? "Cashier"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Opened {new Date(session.opened_at).toLocaleString()}
                        {session.closed_at
                          ? ` • Closed ${new Date(session.closed_at).toLocaleString()}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                      <span>Expected: {formatCurrency(session.expected_cash)}</span>
                      {session.actual_cash !== null && (
                        <span>Actual: {formatCurrency(session.actual_cash)}</span>
                      )}
                      {session.status === "closed" ? (
                        <Badge variant={diff === 0 ? "success" : "warning"}>
                          {diff === 0
                            ? "Balanced"
                            : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
                        </Badge>
                      ) : (
                        <Badge variant="success">OPEN</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
