import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

export type DatePickerProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function parseYmd(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d);
}

function toYmd(date?: Date): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  minYear = 1900,
  maxYear = 2100,
  disabled,
  placeholder = "Seleziona data",
  className,
}: DatePickerProps) {
  const selectedDate = useMemo(() => parseYmd(value || null), [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("pl-3 w-full justify-between text-left font-normal", !selectedDate && "text-muted-foreground", className)}
        >
          {selectedDate ? toYmd(selectedDate) : placeholder}
          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => onChange?.(toYmd(d) as string | null)}
          initialFocus
          captionLayout="dropdown"
          fromYear={minYear}
          toYear={maxYear}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
