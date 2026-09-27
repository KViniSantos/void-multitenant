import { createElement, Fragment, type ReactNode } from "react";
import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react";
import { EMPTY_RICH_TEXT, isSafeRichTextHref, richTextDocumentSchema } from "./rich-text-schema.ts";
import type { RichTextDocument } from "./rich-text-schema.ts";

export { isSafeRichTextHref, richTextDocumentSchema };
export { EMPTY_RICH_TEXT };
export { richTextCharacterCount } from "./rich-text-schema.ts";
export type { RichTextDocument };

const renderReact = renderJSONContentToReactElement({
  nodeMapping: {
    doc: ({ children }) => createElement(Fragment, null, children),
    paragraph: ({ children }) => createElement("p", null, children),
    heading: ({ node, children }) => createElement(node.attrs?.level === 3 ? "h3" : "h2", { className: node.attrs?.textAlign ? "align-" + node.attrs.textAlign : undefined }, children),
    bulletList: ({ children }) => createElement("ul", null, children),
    orderedList: ({ node, children }) => createElement("ol", { start: node.attrs?.order && node.attrs.order !== 1 ? node.attrs.order : undefined }, children),
    listItem: ({ children }) => createElement("li", null, children),
    blockquote: ({ children }) => createElement("blockquote", null, children),
    text: ({ node }) => node.text ?? "",
    hardBreak: () => createElement("br"),
  },
  markMapping: {
    bold: ({ children }) => createElement("strong", null, children),
    italic: ({ children }) => createElement("em", null, children),
    underline: ({ children }) => createElement("u", null, children),
    strike: ({ children }) => createElement("s", null, children),
    code: ({ children }) => createElement("code", null, children),
    link: ({ mark, children }) => isSafeRichTextHref(mark.attrs?.href)
      ? createElement("a", { href: mark.attrs.href, target: "_blank", rel: "noopener noreferrer nofollow" }, children)
      : children,
  },
  unhandledNode: () => null,
  unhandledMark: ({ children }) => children,
});

export function renderRichTextDocument(value: unknown): ReactNode {
  const parsed = richTextDocumentSchema.safeParse(value);
  if (!parsed.success) return null;
  return renderReact({ content: parsed.data as never });
}

