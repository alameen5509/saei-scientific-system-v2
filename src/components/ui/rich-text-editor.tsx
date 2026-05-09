"use client";

// محرر نصوص غني — TipTap مع RTL ودعم تعقيم HTML
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Quote,
  Undo,
  Redo,
  Eye,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const [previewMode, setPreviewMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        HTMLAttributes: {
          class: "text-saei-purple-700 underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        dir: "rtl",
        class: cn(
          "min-h-[200px] rounded-xl border border-saei-purple-100 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-saei-purple/40",
          "prose prose-sm max-w-none rtl",
          "[&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5",
          "[&_blockquote]:border-r-4 [&_blockquote]:border-saei-purple-200 [&_blockquote]:pr-3 [&_blockquote]:text-stone-600",
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-saei-purple-700 [&_h3]:text-base [&_h3]:font-bold"
        ),
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="min-h-[200px] rounded-xl border border-saei-purple-100 bg-white p-3 text-stone-400">
        جارٍ التحميل...
      </div>
    );
  }

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href;
    const url = window.prompt("الرابط (URL):", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-saei-purple-100 bg-saei-purple-50/40 px-2 py-1.5">
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("bold") ? "primary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8"
          title="عريض"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("italic") ? "primary" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8"
          title="مائل"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className="h-8 w-8"
          title="عنوان"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("bulletList") ? "primary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8"
          title="قائمة"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("orderedList") ? "primary" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8"
          title="قائمة مرقمة"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("blockquote") ? "primary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8"
          title="اقتباس"
        >
          <Quote className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={editor.isActive("link") ? "primary" : "ghost"}
          onClick={setLink}
          className="h-8 w-8"
          title="رابط"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="h-5 w-px bg-saei-purple-200 mx-1" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8"
          title="تراجع"
        >
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8"
          title="إعادة"
        >
          <Redo className="h-3.5 w-3.5" />
        </Button>
        <div className="ms-auto">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPreviewMode(!previewMode)}
            className="h-8"
          >
            {previewMode ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                تحرير
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                معاينة
              </>
            )}
          </Button>
        </div>
      </div>

      {previewMode ? (
        <div
          dir="rtl"
          className="min-h-[200px] rounded-xl border border-saei-purple-100 bg-saei-cream/30 p-4 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5"
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      {placeholder && editor.isEmpty && !previewMode && (
        <p className="text-xs text-stone-400 -mt-1 px-3">{placeholder}</p>
      )}
    </div>
  );
}
