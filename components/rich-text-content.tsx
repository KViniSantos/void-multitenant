import type { ReactNode } from "react";
import { renderRichTextDocument } from "@/lib/rich-text";

export function RichTextContent({ document, className = "sf-rich-content" }: { document: unknown; className?: string }) {
  const content: ReactNode = renderRichTextDocument(document);
  if (!content) return null;
  return <div className={className}>{content}</div>;
}
