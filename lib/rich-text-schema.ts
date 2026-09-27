import { z } from "zod";

export type RichTextAlignment = "left" | "center" | "right" | "justify";
export type RichTextMark =
  | { type: "bold" | "italic" | "underline" | "strike" | "code" }
  | { type: "link"; attrs: { href: string; target?: "_blank" | null; rel?: "noopener noreferrer nofollow" | null; class?: null; title?: string | null } };
export type RichTextInline =
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "hardBreak"; marks?: RichTextMark[] };
export type RichTextParagraph = { type: "paragraph"; attrs?: { textAlign?: RichTextAlignment | null }; content?: RichTextInline[] };
export type RichTextHeading = { type: "heading"; attrs: { level: 2 | 3; textAlign?: RichTextAlignment | null }; content?: RichTextInline[] };
export type RichTextListItem = { type: "listItem"; content: RichTextBlock[] };
export type RichTextList = { type: "bulletList"; content: RichTextListItem[] } | { type: "orderedList"; attrs?: { order: number }; content: RichTextListItem[] };
export type RichTextBlock = RichTextParagraph | RichTextHeading | RichTextList | { type: "blockquote"; content: RichTextBlock[] };
export type RichTextDocument = { type: "doc"; content: RichTextBlock[] };

export const EMPTY_RICH_TEXT: RichTextDocument = { type: "doc", content: [{ type: "paragraph" }] };

type RecordValue = Record<string, unknown>;

const allowedAlignments = new Set(["left", "center", "right", "justify"]);
const allowedMarks = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const safeProtocol = /^(https:|mailto:|tel:)/i;
const maxCharacters = 10_000;
const maxNodes = 250;
const maxDepth = 8;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function onlyKeys(value: RecordValue, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function isSafeRichTextHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || !safeProtocol.test(value.trim())) return false;
  const href = value.trim();
  try {
    const url = new URL(href);
    if (url.protocol === "https:") return Boolean(url.hostname) && !url.username && !url.password;
    if (url.protocol === "mailto:") return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decodeURIComponent(url.pathname));
    if (url.protocol === "tel:") return /^\+?[0-9().\s-]{6,32}$/.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
  return false;
}

function validMarks(value: unknown, counts: { nodes: number; characters: number }, depth: number) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 6) return false;
  return value.every((mark) => {
    counts.nodes += 1;
    if (counts.nodes > maxNodes || depth > maxDepth || !isRecord(mark) || typeof mark.type !== "string" || !allowedMarks.has(mark.type)) return false;
    if (mark.type !== "link") return onlyKeys(mark, ["type"]);
    if (!onlyKeys(mark, ["type", "attrs"]) || !isRecord(mark.attrs) || !onlyKeys(mark.attrs, ["href", "target", "rel", "class", "title"])) return false;
    if (!isSafeRichTextHref(mark.attrs.href)) return false;
    if (mark.attrs.target !== undefined && mark.attrs.target !== null && mark.attrs.target !== "_blank") return false;
    if (mark.attrs.rel !== undefined && mark.attrs.rel !== null && mark.attrs.rel !== "noopener noreferrer nofollow") return false;
    if (mark.attrs.class !== undefined && mark.attrs.class !== null) return false;
    return mark.attrs.title === undefined || mark.attrs.title === null || (typeof mark.attrs.title === "string" && mark.attrs.title.length <= 160);
  });
}

function validInline(value: unknown, counts: { nodes: number; characters: number }, depth: number): value is RecordValue {
  counts.nodes += 1;
  if (counts.nodes > maxNodes || depth > maxDepth || !isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "text") {
    if (!onlyKeys(value, ["type", "text", "marks"]) || typeof value.text !== "string" || value.text.length > maxCharacters) return false;
    counts.characters += value.text.length;
    return counts.characters <= maxCharacters && validMarks(value.marks, counts, depth + 1);
  }
  return value.type === "hardBreak" && onlyKeys(value, ["type", "marks"]) && validMarks(value.marks, counts, depth + 1);
}

function validTextAlign(value: unknown) {
  if (!isRecord(value) || !onlyKeys(value, ["textAlign", "level"])) return false;
  if (value.textAlign !== undefined && value.textAlign !== null && (typeof value.textAlign !== "string" || !allowedAlignments.has(value.textAlign))) return false;
  if (value.level !== undefined && value.level !== 2 && value.level !== 3) return false;
  return true;
}

function validBlocks(value: unknown, counts: { nodes: number; characters: number }, depth: number): value is RecordValue[] {
  if (!Array.isArray(value) || value.length > 120) return false;
  return value.every((node) => validBlock(node, counts, depth + 1));
}

function validBlock(value: unknown, counts: { nodes: number; characters: number }, depth: number): value is RecordValue {
  counts.nodes += 1;
  if (counts.nodes > maxNodes || depth > maxDepth || !isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "paragraph" || value.type === "heading") {
    if (!onlyKeys(value, ["type", "attrs", "content"])) return false;
    if (value.attrs !== undefined && !validTextAlign(value.attrs)) return false;
    if (value.type === "heading" && (!isRecord(value.attrs) || (value.attrs.level !== 2 && value.attrs.level !== 3))) return false;
    if (value.type === "paragraph" && isRecord(value.attrs) && value.attrs.level !== undefined) return false;
    if (value.content === undefined) return true;
    return Array.isArray(value.content) && value.content.length <= 300 && value.content.every((child) => validInline(child, counts, depth + 1));
  }
  if (value.type === "bulletList" || value.type === "orderedList") {
    if (!onlyKeys(value, ["type", "attrs", "content"])) return false;
    if (value.type === "bulletList" && value.attrs !== undefined) return false;
    if (value.type === "orderedList" && value.attrs !== undefined) {
      if (!isRecord(value.attrs) || !onlyKeys(value.attrs, ["order"]) || !Number.isInteger(value.attrs.order) || Number(value.attrs.order) < 1 || Number(value.attrs.order) > 1000) return false;
    }
    if (!Array.isArray(value.content) || value.content.length > 50) return false;
    return value.content.every((item) => isRecord(item) && item.type === "listItem" && onlyKeys(item, ["type", "content"]) && validBlocks(item.content, counts, depth + 1));
  }
  if (value.type === "blockquote") {
    return onlyKeys(value, ["type", "content"]) && validBlocks(value.content, counts, depth + 1);
  }
  return false;
}

function isValidRichTextDocument(value: unknown): value is RichTextDocument {
  if (!isRecord(value) || !onlyKeys(value, ["type", "content"]) || value.type !== "doc") return false;
  const counts = { nodes: 0, characters: 0 };
  return validBlocks(value.content, counts, 0) && counts.nodes <= maxNodes && counts.characters <= maxCharacters;
}

export const richTextDocumentSchema = z.custom<RichTextDocument>(
  isValidRichTextDocument,
  "O conteúdo contém uma estrutura ou formatação não permitida.",
);

export function richTextCharacterCount(value: unknown): number {
  const parsed = richTextDocumentSchema.safeParse(value);
  if (!parsed.success) return 0;
  let count = 0;
  const visit = (node: unknown) => {
    if (!isRecord(node)) return;
    if (node.type === "text" && typeof node.text === "string") count += node.text.length;
    if (Array.isArray(node.content)) node.content.forEach(visit);
  };
  visit(parsed.data);
  return count;
}
