"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock, Wallet } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Divider,
  EmptyState,
  FormField,
  Heading,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Stat,
  StatGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  CashRegister,
  CashRegisterSession,
  CurrentRegisterPayload,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function CashManagementPage() {
  const { toast } = useToast();
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
        <Heading as="h1" size="xl" weight="semibold">
          Cash Management
        </Heading>
        <Text size="sm" variant="muted" className="mt-0.5">
          Manage cashier register shifts, cash in/out movements, and end-of-shift reconciliation.
        </Text>
      </div>

      {currentQuery.isLoading ? (
        <Skeleton variant="rounded" height={176} />
      ) : current ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-eta-success" />
                  Active Session —{" "}
                  {current.session.register?.name ?? `Register #${current.session.cash_register_id}`}
                </CardTitle>
                <Text size="xs" variant="muted" className="mt-1">
                  Cashier: {current.session.user?.name ?? "Current User"} • Opened{" "}
                  {new Date(current.session.opened_at).toLocaleString()}
                </Text>
              </div>
              <Badge variant="soft" color="success">
                OPEN
              </Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <StatGroup className="grid gap-3 sm:grid-cols-3">
                <Stat
                  variant="surface"
                  label="Opening Balance"
                  value={
                    <span className="font-mono text-lg">
                      {formatCurrency(current.summary.opening_balance)}
                    </span>
                  }
                />
                <Stat
                  variant="surface"
                  label="Cash Sales"
                  value={
                    <span className="font-mono text-lg text-eta-success">
                      +{formatCurrency(current.summary.cash_sales)}
                    </span>
                  }
                />
                <Stat
                  variant="surface"
                  label="Expected Cash"
                  value={
                    <span className="font-mono text-lg font-bold">
                      {formatCurrency(current.summary.expected_cash)}
                    </span>
                  }
                />
              </StatGroup>

              <div className="grid gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-eta-subtle p-2.5">
                  <span className="text-eta-muted">Cash In:</span>{" "}
                  <span className="font-mono font-medium">
                    +{formatCurrency(current.summary.cash_in)}
                  </span>
                </div>
                <div className="rounded-md bg-eta-subtle p-2.5">
                  <span className="text-eta-muted">Cash Out:</span>{" "}
                  <span className="font-mono font-medium">
                    -{formatCurrency(current.summary.cash_out)}
                  </span>
                </div>
                <div className="rounded-md bg-eta-subtle p-2.5">
                  <span className="text-eta-muted">Cash Refunds:</span>{" "}
                  <span className="font-mono font-medium">
                    -{formatCurrency(current.summary.cash_refund)}
                  </span>
                </div>
                <div className="rounded-md bg-eta-subtle p-2.5">
                  <span className="text-eta-muted">Cash Expenses:</span>{" "}
                  <span className="font-mono font-medium">
                    -{formatCurrency(current.summary.cash_expense)}
                  </span>
                </div>
              </div>

              <Divider spacing="none" />

              <div>
                <h3 className="mb-3 text-sm font-medium text-eta-heading">Record Cash Movement</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={movementType === "cash-in" ? "solid" : "outline"}
                      color={movementType === "cash-in" ? "primary" : undefined}
                      leftIcon={<ArrowDownCircle className="h-3.5 w-3.5" />}
                      onClick={() => setMovementType("cash-in")}
                    >
                      Cash In
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={movementType === "cash-out" ? "solid" : "outline"}
                      color={movementType === "cash-out" ? "primary" : undefined}
                      leftIcon={<ArrowUpCircle className="h-3.5 w-3.5" />}
                      onClick={() => setMovementType("cash-out")}
                    >
                      Cash Out
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
                    variant="solid"
                    color="primary"
                    isLoading={movementMutation.isPending}
                    disabled={movementMutation.isPending || !movementAmount || !movementReason}
                    onClick={() => movementMutation.mutate()}
                  >
                    Record
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Close &amp; Reconcile
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <FormField label="Actual Cash Counted" isRequired>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter counted drawer cash"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="font-mono"
                />
              </FormField>

              {liveDiff !== null && (
                <Alert
                  status={liveDiff === 0 ? "info" : "warning"}
                  variant="soft"
                  title="Estimated Variance"
                >
                  <span className="font-mono font-semibold">
                    {liveDiff > 0 ? "+" : ""}
                    {formatCurrency(liveDiff)} (
                    {liveDiff === 0 ? "Balanced" : liveDiff > 0 ? "Overage" : "Shortage"})
                  </span>
                </Alert>
              )}

              <FormField label="Closing Notes">
                <Input
                  placeholder="Optional shift notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                />
              </FormField>

              <Button
                className="w-full"
                variant="solid"
                color="danger"
                isLoading={closeMutation.isPending}
                disabled={closeMutation.isPending || actualCash === ""}
                onClick={() => closeMutation.mutate()}
              >
                Close Register Session
              </Button>
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Open Cash Register Session
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField label="Cash Register">
                <Select
                  value={selectedRegisterId || String(registers[0]?.id ?? "")}
                  onValueChange={(v) => setSelectedRegisterId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cash register" />
                  </SelectTrigger>
                  <SelectContent>
                    {registers.map((reg) => (
                      <SelectItem key={reg.id} value={String(reg.id)}>
                        {reg.code} — {reg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="sm:w-52">
              <FormField label="Opening Balance">
                <Input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="font-mono"
                />
              </FormField>
            </div>
            <Button
              variant="solid"
              color="primary"
              isLoading={openMutation.isPending}
              disabled={openMutation.isPending || registers.length === 0}
              onClick={() => openMutation.mutate()}
            >
              Open Register
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="space-y-3">
        <Heading as="h2" size="md" weight="semibold">
          Session History
        </Heading>
        {sessions.length === 0 ? (
          <EmptyState
            variant="bordered"
            icon={<Wallet className="h-6 w-6" />}
            title="No cash register sessions yet"
            description="Opened and closed cashier shift sessions will appear here."
          />
        ) : (
          <Table variant="hoverable" size="sm" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Register &amp; Cashier</TableHead>
                <TableHead>Shift Time</TableHead>
                <TableHead align="right">Expected</TableHead>
                <TableHead align="right">Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const diff = session.cash_difference ? Number(session.cash_difference) : 0;
                return (
                  <TableRow key={session.id}>
                    <TableCell className="text-sm font-medium">
                      {session.register?.name ?? `Register #${session.cash_register_id}`} •{" "}
                      {session.user?.name ?? "Cashier"}
                    </TableCell>
                    <TableCell className="text-xs text-eta-muted">
                      Opened {new Date(session.opened_at).toLocaleString()}
                      {session.closed_at
                        ? ` • Closed ${new Date(session.closed_at).toLocaleString()}`
                        : ""}
                    </TableCell>
                    <TableCell align="right" className="font-mono text-xs">
                      {formatCurrency(session.expected_cash)}
                    </TableCell>
                    <TableCell align="right" className="font-mono text-xs">
                      {session.actual_cash !== null ? formatCurrency(session.actual_cash) : "—"}
                    </TableCell>
                    <TableCell>
                      {session.status === "closed" ? (
                        <Badge variant="soft" color={diff === 0 ? "success" : "warning"}>
                          {diff === 0
                            ? "Balanced"
                            : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
                        </Badge>
                      ) : (
                        <Badge variant="soft" color="success">
                          OPEN
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
