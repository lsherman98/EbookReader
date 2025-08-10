"use client";

import * as React from "react";

import { useMarkToolbarButton, useMarkToolbarButtonState } from "platejs/react";

import { ToolbarButton } from "./toolbar";

export function MarkToolbarButton({
  clear,
  nodeType,
  ...props
}: React.ComponentProps<typeof ToolbarButton> & {
  nodeType: string;
  clear?: string[] | string;
}) {
  const state = useMarkToolbarButtonState({ clear, nodeType });
  const { props: buttonProps } = useMarkToolbarButton(state);

  const handleToolBarButtonClick = () => {
    if (nodeType === "highlight") {
      window.dispatchEvent(new CustomEvent("highlight-clicked"));
    }
  };

  return <ToolbarButton {...props} {...buttonProps} onMouseUp={handleToolBarButtonClick} />;
}
