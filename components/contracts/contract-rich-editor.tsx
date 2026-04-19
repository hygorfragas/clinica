"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const abntEditorClass =
  "min-h-[22rem] w-full max-w-none rounded-xl border border-line/80 bg-[#faf8f5] px-8 py-10 text-[12pt] leading-[1.5] text-black shadow-inner outline-none ring-0 focus-visible:ring-2 focus-visible:ring-brand/25 " +
  "[&_.ProseMirror]:min-h-[18rem] [&_.ProseMirror]:outline-none " +
  "[&_.ProseMirror_h1]:text-center [&_.ProseMirror_h1]:text-base [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:uppercase " +
  "[&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-sm [&_.ProseMirror_h2]:font-bold " +
  "[&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold " +
  "[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:text-justify " +
  "[&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_li]:my-0.5 " +
  "[&_.ProseMirror_a]:text-brand [&_.ProseMirror_a]:underline";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ContractRichEditor({
  value,
  onChange,
  placeholder = "Redija o contrato aqui. Use títulos centralizados (Título) para o cabeçalho principal, parágrafos justificados para o corpo e listas quando necessário.",
  disabled,
  className,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-brand underline underline-offset-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    editable: !disabled,
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: abntEditorClass,
        style: 'font-family: "Times New Roman", Times, serif;',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[22rem] animate-pulse rounded-xl bg-muted/60 ring-1 ring-line/60",
          className,
        )}
      />
    );
  }

  const Btn = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "primary" : "secondary"}
      className="h-8 min-w-8 px-2"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("contract-editor-root space-y-3", className)}>
      <div
        className="flex flex-wrap gap-1.5 rounded-2xl bg-surface/90 p-2 shadow-lift ring-1 ring-line/70"
        role="toolbar"
        aria-label="Formatação do contrato"
      >
        <Btn
          label="Negrito"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn
          label="Itálico"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn
          label="Sublinhado"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Btn>
        <Btn
          label="Riscado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden />
        <Btn
          label="Título principal (centralizado)"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Btn>
        <Btn
          label="Subtítulo"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden />
        <Btn
          label="Lista com marcadores"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Btn>
        <Btn
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden />
        <Btn
          label="Alinhar à esquerda"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Btn>
        <Btn
          label="Centralizar"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Btn>
        <Btn
          label="Alinhar à direita"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </Btn>
        <Btn
          label="Justificar (corpo do texto)"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden />
        <Btn label="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn label="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Btn>
      </div>
      <p className="text-xs text-ink-muted">
        Sugestão ABNT: título em caixa alta e centralizado; corpo em parágrafos justificados,
        fonte Times New Roman 12 pt, espaçamento 1,5. Revise numeração e citações com seu
        orientador jurídico.
      </p>
      <EditorContent editor={editor} />
    </div>
  );
}
