import { BaseListPlugin } from "@platejs/list";
import { KEYS } from "platejs";

import { BlockListStatic } from "@/components/ui/block-list-static";

export const BaseListKit = [
  BaseListPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.codeBlock, KEYS.toggle],
    },
    render: {
      belowNodes: BlockListStatic,
    },
  }),
];
