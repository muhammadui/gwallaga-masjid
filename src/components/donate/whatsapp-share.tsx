import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Opens WhatsApp (app or web) with prefilled text. */
export function WhatsAppShare({ text, label, className }: { text: string; label: string; className?: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "secondary", size: "md" }), className)}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.3}>
        <path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.4 18.6z" strokeLinejoin="round" />
        <path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.1.6l-.4.5c-.1.2-.1.4 0 .5.6 1 1.4 1.8 2.4 2.3.2.1.4.1.5 0l.5-.5c.2-.2.4-.2.6-.1l1.3.6c.3.1.4.3.4.5v.4c0 .4-.2.8-.6 1-.5.3-1.2.4-2 .2-2.2-.6-4.1-2.5-4.8-4.7-.2-.9-.1-1.6.2-2.1z" />
      </svg>
      {label}
    </a>
  );
}
