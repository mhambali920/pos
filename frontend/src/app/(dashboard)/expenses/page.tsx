"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  CurrentRegisterPayload,
  ExpenseCategory,
  ExpenseItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ExpensesPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Expense Management</h1>
          <p className="text-sm text-muted-foreground">
            Track store operational expenses with receipt attachments and manager approval workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter expense status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button
            onClick={() => {
              if (!expenseDate) {
                setExpenseDate(new Date().toISOString().slice(0, 10));
              }
              setShowForm((v) => !v);
            }}
          >
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Expense</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                aria-label="Expense category"
                value={categoryId || String(categories[0]?.id ?? "")}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.code} — {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expense Date</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                min="0"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Receipt Attachment (PDF / Image)
              </label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input
                placeholder="Describe the store operational expense"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            {openSession && (
              <label className="sm:col-span-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={useCashDrawer}
                  onChange={(e) => setUseCashDrawer(e.target.checked)}
                />
                Deduct from active cash register session (#{openSession.id}) upon approval
              </label>
            )}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                disabled={createExpenseMutation.isPending || !amount || !description}
                onClick={() => createExpenseMutation.mutate()}
              >
                Submit Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{exp.expense_number}</span>
                      <Badge variant="muted">{exp.category?.name ?? "General"}</Badge>
                      {exp.attachment_path && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" /> Receipt
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5">{exp.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {exp.expense_date} • By {exp.creator?.name ?? "Staff"} •{" "}
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        exp.status === "approved"
                          ? "success"
                          : exp.status === "rejected"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {exp.status}
                    </Badge>
                    {exp.status === "pending_approval" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(exp.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            rejectMutation.mutate({
                              id: exp.id,
                              reason: "Rejected during backoffice review",
                            })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Expense Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
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
            disabled={createCategoryMutation.isPending || !newCatCode || !newCatName}
            onClick={() => createCategoryMutation.mutate()}
          >
            Add Category
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
