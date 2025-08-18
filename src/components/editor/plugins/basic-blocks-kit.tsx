import { BlockquotePlugin, H1Plugin, H2Plugin, H3Plugin, HorizontalRulePlugin } from "@platejs/basic-nodes/react";
import { ParagraphPlugin } from "platejs/react";

import { H1Element, H2Element, H3Element } from "@/components/ui/heading-node";
import { HrElement } from "@/components/ui/hr-node";
import { ParagraphElement } from "@/components/ui/paragraph-node";

export const BasicBlocksKit = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.configure({
    node: {
      component: H1Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+1" } },
  }),
  H2Plugin.configure({
    node: {
      component: H2Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+2" } },
  }),
  H3Plugin.configure({
    node: {
      component: H3Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+3" } },
  }),
  BlockquotePlugin.configure({
    shortcuts: { toggle: { keys: "mod+shift+period" } },
  }),
  HorizontalRulePlugin.withComponent(HrElement),
];
