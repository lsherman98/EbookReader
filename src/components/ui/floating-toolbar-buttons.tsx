import { Highlighter, Trash } from "lucide-react";
import { KEYS } from "platejs";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { useEditorRef } from "platejs/react";

export function FloatingToolbarButtons() {
  const editor = useEditorRef();
  const isHighlighted = editor.api.hasMark("highlight");

  return (
    <>
      {/* <ToolbarGroup>
        <AIToolbarButton tooltip="AI commands">
          <WandSparklesIcon />
          Ask AI
        </AIToolbarButton>
      </ToolbarGroup> */}

      {/* <ToolbarGroup>
        <TurnIntoToolbarButton />

        <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
          <BoldIcon />
        </MarkToolbarButton>

        <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
          <ItalicIcon />
        </MarkToolbarButton>

        <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline (⌘+U)">
          <UnderlineIcon />
        </MarkToolbarButton>

        <MarkToolbarButton nodeType={KEYS.strikethrough} tooltip="Strikethrough (⌘+⇧+M)">
          <StrikethroughIcon />
        </MarkToolbarButton>

        <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
          <Code2Icon />
        </MarkToolbarButton>

        <InlineEquationToolbarButton />

        <LinkToolbarButton />
      </ToolbarGroup> */}

      {/* <ToolbarGroup> */}
      <MarkToolbarButton nodeType={KEYS.highlight}>{isHighlighted ? <Trash /> : <Highlighter />}</MarkToolbarButton>
      {/* <CommentToolbarButton /> */}
      {/* <SuggestionToolbarButton /> */}

      {/* <MoreToolbarButton /> */}
      {/* </ToolbarGroup> */}
    </>
  );
}
