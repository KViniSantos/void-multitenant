import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

let richTextModule = {};
try {
  richTextModule = await import("../lib/rich-text.ts");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

test("rich document validator and safe React renderer are available", () => {
  assert.equal(typeof richTextModule.richTextDocumentSchema?.safeParse, "function");
  assert.equal(typeof richTextModule.renderRichTextDocument, "function");
});

test("rich documents preserve basic formatting and safe links", () => {
  const document = {
    type: "doc",
    content: [{
      type: "paragraph",
      content: [
        { type: "text", text: "Oferta ", marks: [{ type: "bold" }] },
        { type: "text", text: "segura", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      ],
    }],
  };

  assert.equal(richTextModule.richTextDocumentSchema.safeParse(document).success, true);
  assert.equal(
    renderToStaticMarkup(richTextModule.renderRichTextDocument(document)),
    '<p><strong>Oferta </strong><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">segura</a></p>',
  );
});

test("rich documents reject script nodes and javascript links", () => {
  const scriptNode = { type: "doc", content: [{ type: "script", content: [] }] };
  const unsafeLink = {
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "abrir", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
    }],
  };

  assert.equal(richTextModule.richTextDocumentSchema.safeParse(scriptNode).success, false);
  assert.equal(richTextModule.richTextDocumentSchema.safeParse(unsafeLink).success, false);
});

test("HTML typed as plain text is escaped by React rather than interpreted", () => {
  const document = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: '<img src=x onerror="alert(1)">' }] }],
  };

  const markup = renderToStaticMarkup(richTextModule.renderRichTextDocument(document));
  assert.match(markup, /&lt;img src=x onerror=/);
  assert.doesNotMatch(markup, /<img/);
});
