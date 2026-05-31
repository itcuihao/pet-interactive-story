import { useMemo } from "react";
import type { StoryDocument } from "@/types";
import { getLinearNextSceneId } from "@/lib/player";

const NODE_W = 88;
const NODE_H = 32;
const H_GAP = 16;
const V_GAP = 44;
const PAD = 16;

function truncTitle(title: string) {
  return title.length > 5 ? title.slice(0, 5) + "…" : title || "未命名";
}

export function FlowThumbnail({
  story,
  activeSceneId,
  onSceneClick,
}: {
  story: StoryDocument;
  activeSceneId?: string | null;
  onSceneClick: (sceneId: string) => void;
}) {
  const layout = useMemo(() => computeLayout(story), [story]);

  if (layout.nodes.length < 2) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/50 bg-warm-surface p-3">
      <svg
        width={layout.svgWidth}
        height={layout.svgHeight}
        viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
        className="block mx-auto"
      >
        {layout.edges.map((e, i) => {
          const isActive = e.from === activeSceneId || e.to === activeSceneId;
          return (
            <g key={`e${i}`}>
              <path
                d={`M${e.x1},${e.y1} C${e.x1},${e.y1 + 18} ${e.x2},${e.y2 - 18} ${e.x2},${e.y2}`}
                fill="none"
                stroke={isActive ? "var(--color-primary)" : e.type === "choice" ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                strokeWidth={e.type === "choice" ? 1.8 : 1.2}
                strokeDasharray={e.type === "linear" ? "4 3" : undefined}
                opacity={isActive ? 1 : 0.55}
              />
              {e.label ? (
                <g transform={`translate(${e.mx},${e.my})`}>
                  <rect
                    x={-e.label.length * 5 - 4}
                    y={-8}
                    width={e.label.length * 10 + 8}
                    height={16}
                    rx={8}
                    fill="var(--color-background)"
                    stroke="var(--color-primary)"
                    strokeWidth={0.8}
                    opacity={isActive ? 1 : 0.7}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fontFamily="inherit"
                    fill="var(--color-accent-foreground)"
                  >
                    {e.label.length > 4 ? e.label.slice(0, 4) + "…" : e.label}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {layout.nodes.map((n) => {
          const isActive = n.id === activeSceneId;
          return (
            <g
              key={n.id}
              onClick={() => onSceneClick(n.id)}
              className="cursor-pointer"
            >
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isActive ? "var(--color-primary)" : "var(--color-card)"}
                stroke={isActive ? "var(--color-primary)" : n.isEnd ? "var(--color-muted-foreground)" : "var(--color-border)"}
                strokeWidth={isActive ? 1.5 : 1}
              />
              {n.isStart && (
                <circle cx={n.x + 8} cy={n.y + 8} r={3} fill={isActive ? "var(--color-primary-foreground)" : "var(--color-primary)"} opacity={0.7} />
              )}
              {n.isEnd && (
                <rect x={n.x + NODE_W - 12} y={n.y + 4} width={8} height={8} rx={2} fill="none" stroke={isActive ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)"} strokeWidth={0.8} opacity={0.6} />
              )}
              <text
                x={n.x + NODE_W / 2}
                y={n.y + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontFamily="inherit"
                fontWeight={500}
                fill={isActive ? "var(--color-primary-foreground)" : "var(--color-foreground)"}
              >
                {truncTitle(n.title)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---- layout engine ---- */

interface LayoutNode {
  id: string;
  title: string;
  x: number;
  y: number;
  isStart: boolean;
  isEnd: boolean;
}

interface LayoutEdge {
  from: string;
  to: string;
  label?: string;
  type: "linear" | "choice";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
}

interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  svgWidth: number;
  svgHeight: number;
}

function computeLayout(story: StoryDocument): Layout {
  const sceneMap = new Map(story.scenes.map((s) => [s.id, s]));

  // Build adjacency
  const edges: LayoutEdge[] = [];
  const adj = new Map<string, string[]>();

  for (const scene of story.scenes) {
    const nexts: string[] = [];
    if (scene.choices.length > 0) {
      for (const choice of scene.choices) {
        if (sceneMap.has(choice.nextSceneId) && choice.nextSceneId !== scene.id) {
          nexts.push(choice.nextSceneId);
          edges.push({ from: scene.id, to: choice.nextSceneId, label: choice.label, type: "choice", x1: 0, y1: 0, x2: 0, y2: 0, mx: 0, my: 0 });
        }
      }
    } else {
      const next = getLinearNextSceneId(story, scene.id);
      if (next) {
        nexts.push(next);
        edges.push({ from: scene.id, to: next, type: "linear", x1: 0, y1: 0, x2: 0, y2: 0, mx: 0, my: 0 });
      }
    }
    adj.set(scene.id, nexts);
  }

  // BFS assign levels
  const levels = new Map<string, number>();
  const queue = [story.startSceneId];
  levels.set(story.startSceneId, 0);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLevel = levels.get(cur)!;
    for (const next of adj.get(cur) || []) {
      if (!levels.has(next)) {
        levels.set(next, curLevel + 1);
        queue.push(next);
      }
    }
  }

  // Unreachable scenes
  let maxLevel = Math.max(0, ...Array.from(levels.values()));
  for (const scene of story.scenes) {
    if (!levels.has(scene.id)) {
      levels.set(scene.id, ++maxLevel);
    }
  }

  // Group by level, preserve story order
  const levelGroups = new Map<number, string[]>();
  for (const scene of story.scenes) {
    const lv = levels.get(scene.id) ?? 0;
    if (!levelGroups.has(lv)) levelGroups.set(lv, []);
    const g = levelGroups.get(lv)!;
    if (!g.includes(scene.id)) g.push(scene.id);
  }

  // Compute positions
  const nodes: LayoutNode[] = [];
  const posMap = new Map<string, { x: number; y: number }>();
  const maxInLevel = Math.max(1, ...Array.from(levelGroups.values()).map((g) => g.length));
  const totalW = maxInLevel * NODE_W + (maxInLevel - 1) * H_GAP;

  for (const [lv, ids] of levelGroups) {
    const rowW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = (totalW - rowW) / 2;
    ids.forEach((id, i) => {
      const pos = { x: startX + i * (NODE_W + H_GAP), y: lv * (NODE_H + V_GAP) };
      posMap.set(id, pos);
      const scene = sceneMap.get(id)!;
      nodes.push({ id, title: scene.title, ...pos, isStart: id === story.startSceneId, isEnd: !getLinearNextSceneId(story, id) && (scene.choices.length === 0 || !!scene.ending) });
    });
  }

  // Update edge coordinates
  for (const edge of edges) {
    const fp = posMap.get(edge.from);
    const tp = posMap.get(edge.to);
    if (!fp || !tp) { edge.x1 = edge.x2 = edge.y1 = edge.y2 = edge.mx = edge.my = 0; continue; }
    edge.x1 = fp.x + NODE_W / 2;
    edge.y1 = fp.y + NODE_H;
    edge.x2 = tp.x + NODE_W / 2;
    edge.y2 = tp.y;
    edge.mx = (edge.x1 + edge.x2) / 2;
    edge.my = (edge.y1 + edge.y2) / 2;
  }

  const svgWidth = totalW + PAD * 2;
  const svgHeight = (maxLevel + 1) * (NODE_H + V_GAP) - V_GAP + PAD * 2;

  // Offset all positions by padding
  for (const n of nodes) { n.x += PAD; n.y += PAD; }
  for (const e of edges) { e.x1 += PAD; e.y1 += PAD; e.x2 += PAD; e.y2 += PAD; e.mx += PAD; e.my += PAD; }

  return { nodes, edges, svgWidth, svgHeight };
}
