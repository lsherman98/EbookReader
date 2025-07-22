import { createPlatePlugin } from "platejs/react";

const noop = () => {};

export const DisableTextInput = createPlatePlugin({
  key: "DISABLE_INPUT",
  handlers: {
    onKeyDown: ({ event }) => {
      const { ctrlKey, altKey, metaKey, key } = event;
      const isSingleChar = key.length === 1;
      if (isSingleChar && !ctrlKey && !altKey && !metaKey) {
        event.preventDefault();
      }
    },
    onPaste: ({ event }) => {
      event.preventDefault();
    },
    onClick: ({ editor }) => {
      const start = editor.selection?.anchor;
      const end = editor.selection?.focus;

      editor.getTransforms().deselect();

      if (start && end && start?.offset !== end?.offset) {
        editor.getTransforms().select({ anchor: start, focus: end });
      }
    },
  },
  extendEditor: ({ editor }) => {
    editor.deleteBackward = () => noop();
    editor.deleteForward = () => noop();
    editor.deleteFragment = () => noop();
    editor.insertText = () => noop();
    editor.insertBreak = () => noop();
    editor.insertData = () => noop();
    editor.insertFragment = () => noop();
    editor.insertSoftBreak = () => noop();
    editor.insertNode = () => noop();

    return editor;
  },
});
