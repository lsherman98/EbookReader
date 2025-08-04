import { Highlighter } from "lucide-react";
import { KEYS } from "platejs";
import { MarkToolbarButton } from "./mark-toolbar-button";

export function FloatingToolbarButtons() {
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
      <MarkToolbarButton nodeType={KEYS.highlight}>
        <Highlighter />
      </MarkToolbarButton>
      {/* <CommentToolbarButton /> */}
      {/* <SuggestionToolbarButton /> */}

      {/* <MoreToolbarButton /> */}
      {/* </ToolbarGroup> */}
    </>
  );
}
