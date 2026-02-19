import { TokenChip } from './TokenChip';
import type { TokenEntry } from '@/types/worker';

type Props = {
  tokens: TokenEntry[];
  hoveredIdx: number | null;
  lockedIdx: number | null;
  onHover: (idx: number | null) => void;
  onLock: (idx: number | null) => void;
};

export function TokenChipList({ tokens, hoveredIdx, lockedIdx, onHover, onLock }: Props) {
  if (tokens.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Tokens — Hover to preview · click to lock
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((t, i) => {
          const variant = t.isSpecial
            ? 'special'
            : lockedIdx === i
            ? 'locked'
            : hoveredIdx === i
            ? 'hovered'
            : 'normal';

          return (
            <TokenChip
              key={i}
              token={t.token}
              variant={variant}
              onClick={() => {
                if (t.isSpecial) return;
                onLock(i);
              }}
              onMouseEnter={() => {
                if (t.isSpecial) return;
                onHover(i);
              }}
              onMouseLeave={() => {
                if (t.isSpecial) return;
                onHover(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
