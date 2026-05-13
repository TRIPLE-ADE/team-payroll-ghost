"use client";

import { useId, useState, type Ref } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const inputBaseClass =
  "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-ring focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50";

export type FormInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
  type?: React.HTMLInputTypeAttribute;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

export function FormInput({
  ref,
  label,
  error,
  hint,
  id: idProp,
  className,
  inputClassName,
  type = "text",
  showPasswordToggle,
  disabled,
  ...props
}: FormInputProps) {
  const reactId = useId();
  const id = idProp ?? `fld-${reactId.replace(/:/g, "")}`;
  const isPassword = type === "password";
  const toggleEnabled =
    isPassword && (showPasswordToggle !== undefined ? showPasswordToggle : true);
  const [visible, setVisible] = useState(false);
  const inputType =
    isPassword && toggleEnabled ? (visible ? "text" : "password") : type;

  const describedBy =
    error != null && error !== ""
      ? `${id}-error`
      : hint != null && hint !== ""
        ? `${id}-hint`
        : undefined;

  return (
    <div className={cn(className)}>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          ref={ref}
          type={inputType}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            inputBaseClass,
            error && "border-red-500/60",
            toggleEnabled && "pr-11",
            inputClassName,
          )}
          {...props}
        />
        {toggleEnabled ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-subtle-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
