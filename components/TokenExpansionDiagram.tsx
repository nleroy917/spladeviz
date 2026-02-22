// Static SVG diagram illustrating token expansion from a query phrase.
// Modeled after TikZ-style academic diagrams.

const W = 880;
const H = 230;

const SRC_Y = 48;
const SRC_H = 32;
const SRC_W = 96;

const FAN_Y = 112;
const EXP_Y = 138;
const EXP_H = 28;
const EXP_W = 84;
const EXP_GAP = 90; // horizontal distance between expanded token centers

const SOURCES: { label: string; x: number; expanded: string[] }[] = [
  { label: 'python', x: 145, expanded: ['ruby', 'java', 'perl'] },
  { label: 'memory', x: 440, expanded: ['storage', 'cache', 'recall'] },
  { label: 'management', x: 735, expanded: ['control', 'oversight', 'admin'] },
];

const C = {
  arrow: '#64748b',
  srcFill: '#eff6ff',
  srcStroke: '#3b82f6',
  srcText: '#1d4ed8',
  expFill: '#f8fafc',
  expStroke: '#94a3b8',
  expText: '#374151',
  label: '#94a3b8',
};

export function TokenExpansionDiagram() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto w-full max-w-3xl"
      aria-label="Token expansion diagram"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
    >
      <defs>
        <marker id="te-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={C.arrow} />
        </marker>
      </defs>

      {/* Section labels */}
      <text
        x={W / 2}
        y={33}
        textAnchor="middle"
        fontSize={10}
        fill={C.label}
        letterSpacing="0.08em"
      >
        QUERY TOKENS
      </text>
      <text
        x={W / 2}
        y={EXP_Y + EXP_H + 22}
        textAnchor="middle"
        fontSize={10}
        fill={C.label}
        letterSpacing="0.08em"
      >
        NEAREST NEIGHBORS (GloVe cosine similarity)
      </text>

      {SOURCES.map(({ label, x, expanded }) => {
        const expXs = expanded.map((_, i) => x + (i - 1) * EXP_GAP);
        const srcBottom = SRC_Y + SRC_H;

        return (
          <g key={label}>
            {/* ── Source token box ── */}
            <rect
              x={x - SRC_W / 2}
              y={SRC_Y}
              width={SRC_W}
              height={SRC_H}
              rx={4}
              fill={C.srcFill}
              stroke={C.srcStroke}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={SRC_Y + SRC_H / 2 + 5}
              textAnchor="middle"
              fontSize={13}
              fontWeight="600"
              fill={C.srcText}
            >
              {label}
            </text>

            {/* ── Vertical stem from source to fan ── */}
            <line x1={x} y1={srcBottom} x2={x} y2={FAN_Y} stroke={C.arrow} strokeWidth={1.5} />

            {/* ── Horizontal fan bar ── */}
            <line
              x1={expXs[0]}
              y1={FAN_Y}
              x2={expXs[expXs.length - 1]}
              y2={FAN_Y}
              stroke={C.arrow}
              strokeWidth={1.5}
            />

            {/* ── Expanded token drops + boxes ── */}
            {expanded.map((word, i) => {
              const ex = expXs[i];
              return (
                <g key={word}>
                  <line
                    x1={ex}
                    y1={FAN_Y}
                    x2={ex}
                    y2={EXP_Y - 1}
                    stroke={C.arrow}
                    strokeWidth={1.5}
                    markerEnd="url(#te-arrow)"
                  />
                  <rect
                    x={ex - EXP_W / 2}
                    y={EXP_Y}
                    width={EXP_W}
                    height={EXP_H}
                    rx={3}
                    fill={C.expFill}
                    stroke={C.expStroke}
                    strokeWidth={1}
                  />
                  <text
                    x={ex}
                    y={EXP_Y + EXP_H / 2 + 5}
                    textAnchor="middle"
                    fontSize={11}
                    fill={C.expText}
                  >
                    {word}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
