import { BaseAlignKit } from "./align-base-kit";
import { BaseBasicBlocksKit } from "./basic-blocks-base-kit";
import { BaseBasicMarksKit } from "./basic-marks-base-kit";
import { BaseLinkKit } from "./link-base-kit";
import { BaseListKit } from "./list-base-kit";
import { MarkdownKit } from "./markdown-kit";

export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseLinkKit,
  ...BaseBasicMarksKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...MarkdownKit,
];
