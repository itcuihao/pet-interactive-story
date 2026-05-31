import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SelectOption } from "@/types";

export type { SelectOption } from "@/types";

export type SelectFieldProps = {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
};

export function SelectField({ value, options, placeholder = "请选择", onValueChange }: SelectFieldProps) {
  const current = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={(v) => { if (v !== null) onValueChange(v); }}>
      <SelectTrigger className="w-full min-h-[52px]">
        <div className="grid gap-0.5 text-left">
          <SelectValue placeholder={placeholder}>{current?.label}</SelectValue>
          {current?.description ? <span className="text-xs text-muted-foreground">{current.description}</span> : null}
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="grid gap-0.5">
              <span>{option.label}</span>
              {option.description ? <span className="text-xs text-muted-foreground">{option.description}</span> : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
