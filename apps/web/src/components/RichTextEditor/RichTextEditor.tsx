import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Box, Text } from "@mantine/core";
import { useEffect } from "react";
import TextAlign from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Highlight } from "@tiptap/extension-highlight";
interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  label?: string;
  placeholder?: string;
}

export default function CustomRichTextEditor({
  content,
  onChange,
  label,
}: RichTextEditorProps) {
  const parseContent = (val: string) => {
    if (!val) return "";

    const isHtml = /<[a-z][\s\S]*>/i.test(val);
    if (isHtml) return val;
    return val
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Highlight,
    ],
    content: parseContent(content),
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    const parsed = parseContent(content);
    if (editor && parsed && editor.getHTML() !== parsed) {
      editor.commands.setContent(parsed, {
        emitUpdate: false,
      });
    }
  }, [editor, content]);

  return (
    <Box>
      {label && (
        <Text size="sm" fw={500} mb={3}>
          {label}
        </Text>
      )}
      <RichTextEditor
        editor={editor}
        variant="subtle"
        styles={{
          content: {
            minHeight: "200px",
          },
        }}
      >
        <RichTextEditor.Toolbar>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
            <RichTextEditor.Highlight />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignJustify />
            <RichTextEditor.AlignRight />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
