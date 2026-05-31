import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type SelectFieldProps = {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
};

export function SelectField({
  value,
  options,
  placeholder = "请选择",
  onValueChange,
}: SelectFieldProps) {
  const current = options.find((option) => option.value === value);

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="select-field__trigger" aria-label={placeholder}>
        <div className="select-field__value-wrap">
          <Select.Value placeholder={placeholder}>{current?.label}</Select.Value>
          {current?.description ? <span className="select-field__description">{current.description}</span> : null}
        </div>
        <Select.Icon className="select-field__icon">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-field__content" position="popper" sideOffset={8}>
          <Select.Viewport className="select-field__viewport">
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="select-field__item">
                <div className="select-field__item-copy">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  {option.description ? <span>{option.description}</span> : null}
                </div>
                <Select.ItemIndicator className="select-field__item-indicator">
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
