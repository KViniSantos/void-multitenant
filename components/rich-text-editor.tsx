"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { EMPTY_RICH_TEXT, isSafeRichTextHref } from "@/lib/rich-text-schema";
import type { RichTextDocument } from "@/lib/rich-text-schema";

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: false,
    horizontalRule: false,
    codeBlock: false,
  }),
  Link.configure({
    autolink: true,
    defaultProtocol: "https",
    protocols: ["mailto", "tel"],
    openOnClick: false,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    isAllowedUri: (url) => isSafeRichTextHref(url),
    shouldAutoLink: (url) => isSafeRichTextHref(url),
  }),
  TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
];

type Props = {
  value: RichTextDocument | null;
  onChange: (document: RichTextDocument) => void;
  label?: string;
  maxCharacters?: number;
  verticalHint?: string;
};

export function RichTextEditor({ value, onChange, label = "Descrição detalhada", maxCharacters = 10_000, verticalHint }: Props) {
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    extensions: editorExtensions,
    content: value ?? EMPTY_RICH_TEXT,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getJSON() as RichTextDocument),
    editorProps: { attributes: { class: "rich-text-canvas", "aria-label": label } },
  });

  function setLink() {
    if (!editor) return;
    const href = window.prompt("Cole um link HTTPS, e-mail ou telefone:");
    if (href === null) return;
    if (!isSafeRichTextHref(href)) {
      setLinkError("Use um link HTTPS, e-mail válido ou telefone.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({
      href: href.trim(),
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }).run();
    setLinkError("");
  }

  const count = editor?.state.doc.textContent.length ?? 0;
  const tooLong = count > maxCharacters;

  return <div className="rich-text-field">
    <div className="rich-text-label-row"><strong>{label}</strong><span>{count.toLocaleString("pt-BR")} / {maxCharacters.toLocaleString("pt-BR")}</span></div>
    {verticalHint ? <small className="rich-text-hint">{verticalHint}</small> : null}
    <div className="rich-text-editor-shell">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatação do texto">
        <button type="button" aria-label="Negrito" title="Negrito" aria-pressed={editor?.isActive("bold") ?? false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button type="button" aria-label="Itálico" title="Itálico" aria-pressed={editor?.isActive("italic") ?? false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" aria-label="Sublinhado" title="Sublinhado" aria-pressed={editor?.isActive("underline") ?? false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>S</u></button>
        <span aria-hidden="true" className="rich-text-toolbar-divider" />
        <button type="button" aria-label="Título" title="Título" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" aria-label="Subtítulo" title="Subtítulo" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" aria-label="Lista com marcadores" title="Lista com marcadores" aria-pressed={editor?.isActive("bulletList") ?? false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• Lista</button>
        <button type="button" aria-label="Lista numerada" title="Lista numerada" aria-pressed={editor?.isActive("orderedList") ?? false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. Lista</button>
        <button type="button" aria-label="Adicionar link" title="Adicionar link" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={setLink}>↗ Link</button>
        <button type="button" aria-label="Remover link" title="Remover link" disabled={!editor || !editor.isActive("link")} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().unsetLink().run()}>× Link</button>
        <span aria-hidden="true" className="rich-text-toolbar-divider" />
        <button type="button" aria-label="Alinhar à esquerda" title="Alinhar à esquerda" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⇤</button>
        <button type="button" aria-label="Centralizar" title="Centralizar" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
        <button type="button" aria-label="Alinhar à direita" title="Alinhar à direita" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>⇥</button>
      </div>
      <EditorContent editor={editor} />
    </div>
    {tooLong ? <small className="rich-text-error" role="alert">Reduza o texto para no máximo {maxCharacters.toLocaleString("pt-BR")} caracteres.</small> : null}
    {linkError ? <small className="rich-text-error" role="alert">{linkError}</small> : null}
  </div>;
}
