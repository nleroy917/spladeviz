// Diagram illustrating how SPLADE aggregates per-position BERT activations
// into a single sparse vector via max-pooling.

const W = 800;
const H = 265;

const TOKEN_Y = 28;
const TOKEN_H = 30;
const TOKEN_W = 104;

const ENTRY_Y0 = 76; // top of first entry row
const ENTRY_ROW_H = 26;
const ENTRY_ROWS = 3;
const ENTRY_W = 160; // total width of one entry row

const FAN_Y = ENTRY_Y0 + ENTRY_ROWS * ENTRY_ROW_H + 10; // y of horizontal fan bar
const OUT_Y = FAN_Y + 32; // y of output box top
const OUT_H = 30;
const OUT_W = 220;

const COLS: {
  token: string;
  x: number;
  entries: { word: string; score: number }[];
}[] = [
  {
    token: 'python',
    x: 130,
    entries: [
      { word: 'programming', score: 3.21 },
      { word: 'language', score: 2.84 },
      { word: 'java', score: 2.43 },
    ],
  },
  {
    token: 'memory',
    x: 400,
    entries: [
      { word: 'allocation', score: 4.12 },
      { word: 'heap', score: 2.91 },
      { word: 'cache', score: 2.67 },
    ],
  },
  {
    token: 'management',
    x: 670,
    entries: [
      { word: 'control', score: 3.45 },
      { word: 'handling', score: 2.12 },
      { word: 'system', score: 1.98 },
    ],
  },
];

const maxScore = Math.max(...COLS.flatMap((c) => c.entries.map((e) => e.score)));

const C = {
  arrow: '#64748b',
  tokenFill: '#eff6ff',
  tokenStroke: '#3b82f6',
  tokenText: '#1d4ed8',
  entryBg: '#f8fafc',
  entryStroke: '#e2e8f0',
  bar: 'hsl(221 83% 53% / 0.55)',
  outFill: '#f0fdf4',
  outStroke: '#16a34a',
  outText: '#15803d',
  label: '#94a3b8',
  dimText: '#64748b',
};

export function SpladeAggregationDiagram() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto w-full max-w-3xl"
      aria-label="SPLADE max-pool aggregation diagram"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
    >
      <defs>
        <marker id="sa-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={C.arrow} />
        </marker>
      </defs>

      {/* Section labels */}
      <text
        x={W / 2}
        y={15}
        textAnchor="middle"
        fontSize={10}
        fill={C.label}
        letterSpacing="0.08em"
      >
        BERT ACTIVATIONS — log(1 + ReLU(x)) PER TOKEN POSITION
      </text>
      <text
        x={W / 2}
        y={OUT_Y + OUT_H + 20}
        textAnchor="middle"
        fontSize={10}
        fill={C.label}
        letterSpacing="0.08em"
      >
        SPLADE SPARSE VECTOR (max-pool across positions)
      </text>

      {COLS.map(({ token, x, entries }) => {
        const tokenBoxX = x - TOKEN_W / 2;
        const tokenBottom = TOKEN_Y + TOKEN_H;

        return (
          <g key={token}>
            {/* ── Input token box ── */}
            <rect
              x={tokenBoxX}
              y={TOKEN_Y}
              width={TOKEN_W}
              height={TOKEN_H}
              rx={4}
              fill={C.tokenFill}
              stroke={C.tokenStroke}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={TOKEN_Y + TOKEN_H / 2 + 5}
              textAnchor="middle"
              fontSize={13}
              fontWeight="600"
              fill={C.tokenText}
            >
              {token}
            </text>

            {/* ── Arrow from token to entries ── */}
            <line
              x1={x}
              y1={tokenBottom}
              x2={x}
              y2={ENTRY_Y0 - 4}
              stroke={C.arrow}
              strokeWidth={1}
              strokeDasharray="3 2"
            />

            {/* ── Activated score rows ── */}
            {entries.map(({ word, score }, ei) => {
              const rowY = ENTRY_Y0 + ei * ENTRY_ROW_H;
              const rowX = x - ENTRY_W / 2;
              const barMaxW = 60;
              const barW = (score / maxScore) * barMaxW;
              const wordX = rowX + 4;
              const barX = rowX + ENTRY_W - barMaxW - 38;
              const scoreX = rowX + ENTRY_W - 2;

              return (
                <g key={word}>
                  <rect
                    x={rowX}
                    y={rowY}
                    width={ENTRY_W}
                    height={ENTRY_ROW_H - 3}
                    rx={2}
                    fill={C.entryBg}
                    stroke={C.entryStroke}
                    strokeWidth={0.75}
                  />
                  {/* word */}
                  <text x={wordX + 2} y={rowY + 16} fontSize={11} fill={C.dimText}>
                    {word}
                  </text>
                  {/* score bar */}
                  <rect x={barX} y={rowY + 5} width={barW} height={12} rx={1} fill={C.bar} />
                  {/* score number */}
                  <text
                    x={scoreX - 2}
                    y={rowY + 16}
                    fontSize={10}
                    textAnchor="end"
                    fill={C.dimText}
                  >
                    {score.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* ── Vertical stem to fan bar ── */}
            <line
              x1={x}
              y1={ENTRY_Y0 + ENTRY_ROWS * ENTRY_ROW_H}
              x2={x}
              y2={FAN_Y}
              stroke={C.arrow}
              strokeWidth={1.5}
            />
          </g>
        );
      })}

      {/* ── Horizontal fan bar ── */}
      <line
        x1={COLS[0].x}
        y1={FAN_Y}
        x2={COLS[COLS.length - 1].x}
        y2={FAN_Y}
        stroke={C.arrow}
        strokeWidth={1.5}
      />

      {/* ── max-pool label on the bar ── */}
      <text x={W / 2} y={FAN_Y - 5} textAnchor="middle" fontSize={10} fill={C.label}>
        max( · )
      </text>

      {/* ── Arrow from fan bar centre to output ── */}
      <line
        x1={W / 2}
        y1={FAN_Y}
        x2={W / 2}
        y2={OUT_Y - 1}
        stroke={C.arrow}
        strokeWidth={1.5}
        markerEnd="url(#sa-arrow)"
      />

      {/* ── Output sparse vector box ── */}
      <rect
        x={W / 2 - OUT_W / 2}
        y={OUT_Y}
        width={OUT_W}
        height={OUT_H}
        rx={4}
        fill={C.outFill}
        stroke={C.outStroke}
        strokeWidth={1.5}
      />
      <text
        x={W / 2}
        y={OUT_Y + OUT_H / 2 + 5}
        textAnchor="middle"
        fontSize={12}
        fontWeight="600"
        fill={C.outText}
      >
        sparse vector
      </text>
    </svg>
  );
}