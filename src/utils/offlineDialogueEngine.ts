import type { OfflineDialogueTree, OfflineTreeNode, OfflineTreeOption } from "../data/offlineDialogues/types";

export function renderOfflineTemplate(
  template: string,
  vars: { firstName: string; knowledge: string }
): string {
  const knowledgeShort =
    vars.knowledge.trim().length > 280
      ? `${vars.knowledge.trim().slice(0, 277)}…`
      : vars.knowledge.trim();
  return template
    .replace(/\{\{firstName\}\}/g, vars.firstName)
    .replace(/\{\{knowledge\}\}/g, knowledgeShort);
}

export function getNode(tree: OfflineDialogueTree, nodeId: string): OfflineTreeNode | undefined {
  return tree.nodes[nodeId];
}

/** Подбор ветки по ключевым словам; иначе — последняя опция как «другое». */
export function matchOfflineOption(
  options: OfflineTreeOption[],
  userText: string
): OfflineTreeOption {
  const t = userText.trim().toLowerCase();
  if (!t) return options[options.length - 1];

  let best: OfflineTreeOption = options[options.length - 1];
  let bestScore = -1;

  for (const opt of options) {
    if (!opt.keywords?.length) continue;
    let score = 0;
    for (const kw of opt.keywords) {
      if (t.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = opt;
    }
  }

  if (bestScore <= 0) {
    const byLabel = options.find((o) =>
      t.includes(o.label.slice(0, Math.min(12, o.label.length)).toLowerCase())
    );
    return byLabel ?? options[options.length - 1];
  }

  return best;
}

export function nodeIsTerminal(node: OfflineTreeNode): boolean {
  return !node.options || node.options.length === 0;
}
