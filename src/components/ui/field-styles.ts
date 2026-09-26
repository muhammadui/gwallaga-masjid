/**
 * Shared control styling. Fields never animate beyond colour/opacity.
 * Warm hairline (not grey), soft surface, indigo focus ring.
 */
export const controlBase = [
  "w-full min-w-0 rounded-(--radius-field) bg-surface text-fg",
  "ring-1 ring-inset ring-line-strong",
  "placeholder:text-muted/70",
  "transition-[box-shadow,background-color] duration-300 ease-[var(--ease-soft)]",
  "hover:ring-(--fg)/35",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:ring-2 aria-invalid:ring-danger/70",
].join(" ");
