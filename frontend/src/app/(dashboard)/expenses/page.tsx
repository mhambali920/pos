"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Plus, Receipt, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  useToast,
} from "@eta-ui/react";
import { IsoDatePicker } from "@/components/shared/iso-date-picker";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  CurrentRegisterPayload,
  ExpenseCategory,
  ExpenseItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [useCashDrawer, setUseCashDrawer] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => apiFetch<ExpenseCategory[]>("/expenses/categories"),
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", statusFilter],
    queryFn: () =>
      apiFetch<ExpenseItem[]>(
        `/expenses${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`
      ),
  });

  const currentRegisterQuery = useQuery({
    queryKey: ["cash-register-current"],
    queryFn: () => apiFetch<CurrentRegisterPayload | null>("/cash-register/current"),
  });

  const createExpenseMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("category_id", categoryId || String(categoriesQuery.data?.data[0]?.id ?? ""));
      formData.append("expense_date", expenseDate);
      formData.append("amount", amount);
      formData.append("description", description);
      if (useCashDrawer && currentRegisterQuery.data?.data?.session.id) {
        formData.append(
          "cash_register_session_id",
          String(currentRegisterQuery.data.data.session.id)
        );
      }
      if (attachment) {
        formData.append("attachment", attachment);
      }
      return apiFetch<ExpenseItem>("/expenses", { method: "POST", body: formData });
    },
    onSuccess: () => {
      toast.success("Expense submitted for approval.");
      setAmount("");
      setDescription("");
      setAttachment(null);
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create expense."),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/expenses/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Expense approved.");
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["cash-register-current"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Approve failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch(`/expenses/${id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: () => {
      toast.success("Expense rejected.");
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Reject failed."),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      apiFetch("/expenses/categories", {
        method: "POST",
        body: { code: newCatCode, name: newCatName },
      }),
    onSuccess: () => {
      toast.success("Expense category added.");
      setNewCatCode("");
      setNewCatName("");
      void queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add category."),
  });

  const categories = categoriesQuery.data?.data ?? [];
  const expenses = expensesQuery.data?.data ?? [];
  const openSession = currentRegisterQuery.data?.data?.session ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Expense Management
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Track store operational expenses with receipt attachments and manager approval workflow.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(!v || v === "all" ? "" : v)}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="solid"
            color="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              if (!expenseDate) {
                setExpenseDate(new Date().toISOString().slice(0, 10));
              }
              setShowForm((v) => !v);
            }}
          >
            New Expense
          </Button>
        </div>
      </div>

      {showForm && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Submit Expense</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <Select
                value={categoryId || String(categories[0]?.id ?? "")}
                onValueChange={(v) => setCategoryId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.code} — {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Expense Date">
              <IsoDatePicker
                value={expenseDate}
                onChange={setExpenseDate}
                placeholder="Select expense date"
              />
            </FormField>

            <FormField label="Amount" isRequired>
              <Input
                type="number"
                min="0"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
            </FormField>

            <FormField label="Receipt Attachment (PDF / Image)">
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Description" isRequired>
                <Input
                  placeholder="Describe the store operational expense"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>
            </div>

            {openSession && (
              <div className="sm:col-span-2">
                <Checkbox
                  label={`Deduct from active cash register session (#${openSession.id}) upon approval`}
                  checked={useCashDrawer}
                  onCheckedChange={(v) => setUseCashDrawer(Boolean(v))}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                isLoading={createExpenseMutation.isPending}
                disabled={createExpenseMutation.isPending || !amount || !description}
                onClick={() => createExpenseMutation.mutate()}
              >
                Submit Expense
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {expensesQuery.isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} variant="rounded" height={48} />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<Receipt className="h-6 w-6" />}
          title="No expenses recorded yet"
          description="Submitted operational expenses will appear here for approval."
        />
      ) : (
        <Table variant="hoverable" size="sm" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Expense #</TableHead>
              <TableHead>Category &amp; Description</TableHead>
              <TableHead>Date &amp; Staff</TableHead>
              <TableHead align="right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>{exp.expense_number}</span>
                    {exp.attachment_path && (
                      <span
                        className="inline-flex items-center gap-1 text-eta-muted"
                        title="Has receipt attachment"
                      >
                        <FileText className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-eta-heading">{exp.description}</div>
                    <div>
                      <Badge variant="soft" color="neutral" size="sm">
                        {exp.category?.name ?? "General"}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-eta-muted">
                  {exp.expense_date} • By {exp.creator?.name ?? "Staff"}
                </TableCell>
                <TableCell align="right" className="font-mono text-xs font-semibold">
                  {formatCurrency(exp.amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="soft"
                    color={
                      exp.status === "approved"
                        ? "success"
                        : exp.status === "rejected"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {exp.status}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  {exp.status === "pending_approval" && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-eta-success" />}
                        onClick={() => approveMutation.mutate(exp.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="soft"
                        color="danger"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() =>
                          rejectMutation.mutate({
                            id: exp.id,
                            reason: "Rejected during backoffice review",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Add Expense Category</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Code (e.g. TRANS)"
            value={newCatCode}
            onChange={(e) => setNewCatCode(e.target.value)}
            className="sm:w-40"
          />
          <Input
            placeholder="Category Name (e.g. Delivery & Transport)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="solid"
            color="primary"
            isLoading={createCategoryMutation.isPending}
            disabled={createCategoryMutation.isPending || !newCatCode || !newCatName}
            onClick={() => createCategoryMutation.mutate()}
          >
            Add Category
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
