import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReactElement } from "react";
import { Resend } from "resend";

/**
 * Transactional email. Uses Resend when RESEND_API_KEY is set; otherwise logs
 * a readable summary and writes the HTML to .dev-mail/<timestamp>-<subject>.html
 * (gitignored) so flows can be tested without a mail provider.
 *
 * Sender: EMAIL_FROM (e.g. `Gwallaga Juma'at Masjid <no-reply@yourdomain>`).
 */

export interface EmailAttachment {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  replyTo?: string;
  /** Plain-text alternative. Derived from html when omitted. */
  text?: string;
  attachments?: EmailAttachment[];
} & ({ react: ReactElement; html?: never } | { html: string; react?: never });

export type SendEmailResult = { ok: true; id: string; mode: "resend" | "dev" } | { ok: false; error: string };

const DEFAULT_FROM = "Gwallaga Juma'at Masjid <no-reply@example.com>";

let client: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

async function renderReact(el: ReactElement): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return `<!doctype html>${renderToStaticMarkup(el)}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toBuffer(c: EmailAttachment["content"]): Buffer {
  return typeof c === "string" ? Buffer.from(c) : Buffer.from(c);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const to = Array.isArray(input.to) ? input.to : [input.to];
  try {
    const html = input.react ? await renderReact(input.react) : input.html!;
    const text = input.text ?? htmlToText(html);
    const r = resend();

    if (r) {
      const { data, error } = await r.emails.send({
        from,
        to,
        subject: input.subject,
        html,
        text,
        replyTo: input.replyTo,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: toBuffer(a.content),
          contentType: a.contentType,
        })),
      });
      if (error || !data) return { ok: false, error: error?.message ?? "Resend returned no id" };
      return { ok: true, id: data.id, mode: "resend" };
    }

    // Dev fallback
    const dir = path.join(process.cwd(), ".dev-mail");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = input.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "email";
    const base = `${stamp}-${slug}`;
    await writeFile(path.join(dir, `${base}.html`), html, "utf8");
    for (const a of input.attachments ?? []) {
      await writeFile(path.join(dir, `${base}--${a.filename.replace(/[^\w.-]+/g, "_")}`), toBuffer(a.content));
    }
    const preview = text.split("\n").filter(Boolean).slice(0, 6).join("\n    ");
    console.info(
      [
        "",
        "┌─ [email:dev] not sent (RESEND_API_KEY unset)",
        `│ from:    ${from}`,
        `│ to:      ${to.join(", ")}`,
        `│ subject: ${input.subject}`,
        input.attachments?.length ? `│ attach:  ${input.attachments.map((a) => a.filename).join(", ")}` : null,
        `│ saved:   .dev-mail/${base}.html`,
        `└─ ${preview}`,
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { ok: true, id: base, mode: "dev" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", error);
    return { ok: false, error };
  }
}
