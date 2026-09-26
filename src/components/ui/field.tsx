import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export interface FieldProps {
  /** Form field name; also derives the control id (`field-<name>`) unless `id` is given. */
  name: string;
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  /** A single control: <Input/>, <Textarea/>, <Select/>. id/aria props are injected. */
  children: ReactElement<Record<string, unknown>>;
}

/**
 * Label + control + hint + error, wired for accessibility:
 *
 *   <Field name="groomName" label="Full name" error={errors.groomName?.message} required>
 *     <Input {...register("groomName")} autoComplete="name" />
 *   </Field>
 */
export function Field({ name, label, id, hint, error, required, className, children }: FieldProps) {
  const controlId = id ?? `field-${name}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        name: (children.props.name as string | undefined) ?? name,
        required: (children.props.required as boolean | undefined) ?? required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={controlId} required={required}>
        {label}
      </Label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-[0.8125rem] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.8125rem] leading-snug text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
