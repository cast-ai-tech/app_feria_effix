import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white placeholder:text-brand-muted outline-none " +
  "focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60";

type BaseProps = {
  label: string;
  name: string;
  required?: boolean;
  className?: string;
};

type InputProps = BaseProps & {
  type?: "text" | "email" | "password" | "date" | "time";
  /** Controlado: pasa value + onChange. Sin ellos, funciona no-controlado
   *  (con defaultValue) para formularios que usan FormData nativo. */
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
};

export function Field({
  label,
  name,
  required,
  type = "text",
  value,
  onChange,
  defaultValue,
  placeholder,
  autoComplete,
  className,
}: InputProps) {
  const controlled =
    value !== undefined
      ? {
          value,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            onChange?.(e.target.value),
        }
      : { defaultValue };
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold text-brand-dim">
        {label}
        {required && <span className="text-brand-lav"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={CONTROL}
        {...controlled}
      />
    </label>
  );
}

type TextAreaProps = BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
};

export function TextAreaField({
  label,
  name,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: TextAreaProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold text-brand-dim">
        {label}
        {required && <span className="text-brand-lav"> *</span>}
      </span>
      <textarea
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, "resize-none")}
      />
    </label>
  );
}

type SelectOption = { value: string; label: string };

type SelectProps = BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

export function SelectField({
  label,
  name,
  required,
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold text-brand-dim">
        {label}
        {required && <span className="text-brand-lav"> *</span>}
      </span>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, "appearance-none")}
      >
        {placeholder && (
          <option value="" className="bg-brand-black">
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-brand-black">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
