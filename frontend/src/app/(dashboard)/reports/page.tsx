"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Download, FileSpreadsheet, Plus, Tag } from "lucide-react";
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
  Stat,
  StatGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  useToast,
} from "@eta-ui/react";
import { IsoDatePicker } from "@/components/shared/iso-date-picker";
import { apiFetch, ApiError } from "@/lib/api";
import type { PromotionItem, ReportExportItem, ReportPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type TabType = "sales" | "inventory" | "purchasing" | "financial" | "promotions" | "exports";

export default function ReportsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("financial");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState("percentage");
  const [promoValue, setPromoValue] = useState("10");
  const [promoStackable, setPromoStackable] = useState(true);

  const isReportTab =
    activeTab === "sales" ||
    activeTab === "inventory" ||
    activeTab === "purchasing" ||
    activeTab === "financial";

  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString();

  const reportQuery = useQuery({
    queryKey: ["report", activeTab, dateFrom, dateTo],
    queryFn: () => apiFetch<ReportPayload>(`/reports/${activeTab}${qs ? `?${qs}` : ""}`),
    enabled: isReportTab,
  });

  const promotionsQuery = useQuery({
    queryKey: ["promotions"],
    queryFn: () => apiFetch<PromotionItem[]>("/promotions"),
    enabled: activeTab === "promotions",
  });

  const exportsQuery = useQuery({
    queryKey: ["report-exports"],
    queryFn: () => apiFetch<ReportExportItem[]>("/reports/exports"),
    enabled: activeTab === "exports",
  });

  const exportMutation = useMutation({
    mutationFn: (format: "csv" | "excel" | "pdf") =>
      apiFetch<ReportExportItem>(`/reports/${activeTab}/export`, {
        method: "POST",
        body: {
          format,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Export (${res.data.format.toUpperCase()}) ${res.data.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["report-exports"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Export failed."),
  });

  const createPromoMutation = useMutation({
    mutationFn: () =>
      apiFetch("/promotions", {
        method: "POST",
        body: {
          code: promoCode,
          name: promoName,
          type: promoType,
          is_stackable: promoStackable,
          rules:
            promoType === "percentage" || promoType === "time_based"
              ? { percentage: Number(promoValue) }
              : { amount: promoValue },
        },
      }),
    onSuccess: () => {
      toast.success("Promotion created.");
      setPromoCode("");
      setPromoName("");
      void queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create promotion."),
  });

  const report = reportQuery.data?.data;
  const promotions = promotionsQuery.data?.data ?? [];
  const exportsList = exportsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Reports, Promotions &amp; Exports
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Sales, inventory valuation, purchasing, P&amp;L financial statements, promotions, and async exports.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IsoDatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Start date"
            allowClear
            size="sm"
            className="w-40"
          />
          <IsoDatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="End date"
            allowClear
            size="sm"
            className="w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          variant="underline"
          size="sm"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
        >
          <TabsList>
            <TabsTrigger value="financial">Financial (P&amp;L)</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="exports">Async Exports</TabsTrigger>
          </TabsList>
        </Tabs>

        {isReportTab && (
          <div className="flex items-center gap-1.5">
            {(["csv", "excel", "pdf"] as const).map((fmt) => (
              <Button
                key={fmt}
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate(fmt)}
              >
                {fmt.toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isReportTab && (
        <div className="space-y-4">
          {report && (
            <StatGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(report.summary).map(([key, val]) => (
                <Stat
                  key={key}
                  variant="surface"
                  label={key.replaceAll("_", " ")}
                  value={
                    <span className="font-mono text-xl font-bold">
                      {typeof val === "string" && val.includes(".")
                        ? formatCurrency(val)
                        : String(val)}
                    </span>
                  }
                />
              ))}
            </StatGroup>
          )}

          <Card variant="elevated" padding="none">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle className="capitalize">{activeTab} Report Details</CardTitle>
            </CardHeader>
            <CardBody>
              {reportQuery.isLoading ? (
                <div className="space-y-2 p-6 pt-0">
                  {[1, 2, 3].map((n) => (
                    <Skeleton key={n} variant="rounded" height={44} />
                  ))}
                </div>
              ) : !report || report.rows.length === 0 ? (
                <div className="p-6 pt-0">
                  <EmptyState
                    variant="bordered"
                    icon={<BarChart3 className="h-6 w-6" />}
                    title="No records for this period"
                    description="Adjust the date filters to view report details."
                  />
                </div>
              ) : (
                <Table variant="hoverable" size="sm">
                  <TableHeader>
                    <TableRow>
                      {Object.keys(report.rows[0]).map((col) => (
                        <TableHead key={col} className="capitalize">
                          {col.replaceAll("_", " ")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(row).map((cell, cIdx) => (
                          <TableCell key={cIdx} className="font-mono text-xs">
                            {String(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-4">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Create Promotion
              </CardTitle>
            </CardHeader>
            <CardBody className="grid gap-3 sm:grid-cols-5">
              <FormField label="Code" isRequired>
                <Input
                  placeholder="Code (e.g. WEEKEND10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </FormField>
              <FormField label="Promotion Name" isRequired>
                <Input
                  placeholder="Promotion Name"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                />
              </FormField>
              <FormField label="Type">
                <Select value={promoType} onValueChange={(v) => setPromoType(v ?? "percentage")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="coupon">Coupon</SelectItem>
                    <SelectItem value="bogo">BOGO</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Value">
                <Input
                  type="number"
                  placeholder="Value"
                  value={promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                />
              </FormField>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  variant="solid"
                  color="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  isLoading={createPromoMutation.isPending}
                  disabled={createPromoMutation.isPending || !promoCode || !promoName}
                  onClick={() => createPromoMutation.mutate()}
                >
                  Create
                </Button>
              </div>
              <div className="sm:col-span-5">
                <Checkbox
                  label="Allow stacking with lower-priority promotions"
                  checked={promoStackable}
                  onCheckedChange={(v) => setPromoStackable(Boolean(v))}
                />
              </div>
            </CardBody>
          </Card>

          <Card variant="elevated" padding="none">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle>Active Promotions</CardTitle>
            </CardHeader>
            <CardBody>
              {promotions.length === 0 ? (
                <div className="p-6 pt-0">
                  <EmptyState
                    variant="bordered"
                    icon={<Tag className="h-6 w-6" />}
                    title="No promotions configured yet"
                    description="Create a discount or coupon rule above."
                  />
                </div>
              ) : (
                <Table variant="hoverable" size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Stacking</TableHead>
                      <TableHead align="right">Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-semibold">{p.code}</TableCell>
                        <TableCell className="text-sm">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="soft" color="neutral">
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="soft" color={p.is_stackable ? "success" : "warning"}>
                            {p.is_stackable ? "Stackable" : "Exclusive"}
                          </Badge>
                        </TableCell>
                        <TableCell align="right" className="font-mono text-xs text-eta-muted">
                          {p.priority}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "exports" && (
        <Card variant="elevated" padding="none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle>Async Export History</CardTitle>
          </CardHeader>
          <CardBody>
            {exportsList.length === 0 ? (
              <div className="p-6 pt-0">
                <EmptyState
                  variant="bordered"
                  icon={<FileSpreadsheet className="h-6 w-6" />}
                  title="No exports queued yet"
                  description="Trigger a CSV, Excel, or PDF export from any report tab."
                />
              </div>
            ) : (
              <Table variant="hoverable" size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportsList.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium capitalize">
                        {exp.report_type} Report
                      </TableCell>
                      <TableCell className="font-mono text-xs uppercase">
                        {exp.format}
                      </TableCell>
                      <TableCell className="text-xs text-eta-muted">
                        {new Date(exp.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="soft"
                          color={exp.status === "completed" ? "success" : "warning"}
                        >
                          {exp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
