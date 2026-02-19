import type { WeightEntry } from '@/types/worker';

const W = 54;
const H = 44;
const PAD = 3;
const INNER_H = H - PAD * 2;
const INNER_W = W - PAD * 2;

type Props = {
  entries: WeightEntry[];
  isHovered: boolean;
  isLocked: boolean;
  isSpecial: boolean;
};

export function MiniSparkline({ entries, isHovered, isLocked, isSpecial }: Props) {
  const n = entries.length;
  const max = entries[0]?.weight ?? 1;

  const barFill  = isLocked ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--primary) / 0.65)' : 'hsl(var(--primary) / 0.3)';
  const border   = isLocked ? '1.5px solid hsl(var(--primary))' : isHovered ? '1.5px solid hsl(var(--primary) / 0.55)' : '1.5px solid hsl(var(--border))';
  const bg       = isLocked ? 'hsl(var(--primary) / 0.08)' : isHovered ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--background))';

  if (isSpecial || n === 0) {
    return (
      <svg width={W} height={H} style={{ background: 'hsl(var(--muted))', border: '1.5px solid hsl(var(--border))', borderRadius: 4 }}>
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="hsl(var(--border))" strokeWidth="1.5" />
      </svg>
    );
  }

  const step = INNER_W / n;
  const barW = Math.max(1.5, step - 0.8);

  return (
    <svg
      width={W}
      height={H}
      style={{ background: bg, border, borderRadius: 4, transition: 'background 150ms, border-color 150ms' }}
    >
      {entries.map((e, i) => {
        const barH = Math.max(1, (e.weight / max) * INNER_H);
        return (
          <rect
            key={i}
            x={PAD + i * step}
            y={H - PAD - barH}
            width={barW}
            height={barH}
            fill={barFill}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}