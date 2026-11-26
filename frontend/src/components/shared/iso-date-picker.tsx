"use client";

import * as React from "react";
import { DatePicker, type DatePickerSize } from "@eta-ui/react";

interface IsoDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
  size?: DatePickerSize;
  className?: string;
}

function parseIsoLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function formatIsoLocalDate(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function IsoDatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date...",
  allowClear = false,
  disabled = false,
  isInvalid = false,
  size = "md",
  className,
}: IsoDatePickerProps) {
  const selectedDate = React.useMemo(() => parseIsoLocalDate(value), [value]);

  return (
    <DatePicker
      id={id}
      value={selectedDate}
      onChange={(nextDate) => onChange(formatIsoLocalDate(nextDate))}
      placeholder={placeholder}
      isClearable={allowClear}
      disabled={disabled}
      isInvalid={isInvalid}
      size={size}
      dateFormat="dd/mm/yyyy"
      className={className}
    />
  );
}
