import { cn } from '@/lib/utils';
import { MiniSparkline } from './MiniSparkline';
import type { TokenEntry, WeightEntry } from '@/types/worker';

const COL_W = 80; // px per token column

type Props = {
  tokens: TokenEntry[];
  tokenDistributions: WeightEntry[][];
  hoveredIdx: number | null;
  lockedIdx: number | null;
  onHover: (idx: number | null) => void;
  onLock: (idx: number | null) => void;
};

function DownArrow() {
  return (
    <svg width="12" height="22" viewBox="0 0 12 22" aria-hidden>
      <line x1="6" y1="0" x2="6" y2="15" stroke="#cbd5e1" strokeWidth="1.5" />
      <polygon points="6,22 2,14 10,14" fill="#cbd5e1" />
    </svg>
  );
}

export function SpladeFlowDiagram({
  tokens,
  tokenDistributions,
  hoveredIdx,
  lockedIdx,
  onHover,
  onLock,
}: Props) {
  const n = tokens.length;

  return (
    <div className="overflow-x-auto">
      <div
        style={{
          display: 'grid',
          // gridTemplateColumns: `repeat(${n}, ${COL_W}px)`,
          minWidth: n * COL_W,
        }}
        className='mx-auto'
      >
        {/* ── Row 1: Token strings ── */}
        {tokens.map((t, i) => (
          <div key={`str-${i}`} className="flex justify-center items-end px-1 pb-1" style={{ minHeight: 36 }}>
            <span
              className={cn(
                'font-mono text-xs text-center break-all leading-tight',
                t.isSpecial ? 'text-slate-400' : 'text-slate-700 font-medium'
              )}
            >
              {t.token}
            </span>
          </div>
        ))}

        {/* ── Row 2: Token ID boxes ── */}
        {tokens.map((t, i) => (
          <div
            onClick={() => { if (!t.isSpecial) onLock(i); }}
            onMouseEnter={() => { if (!t.isSpecial) onHover(i); }}
            onMouseLeave={() => onHover(null)}
            key={`id-${i}`}
            className={
              cn("flex justify-center pb-1", !t.isSpecial && "cursor-pointer")
            }
            title={t.isSpecial ? undefined : `Click to inspect "${t.token}" distribution`}
          >
            <div
              className={cn(
                'border rounded px-1.5 py-0.5 text-xs font-mono tabular-nums text-center transition-colors',
                lockedIdx === i
                  ? 'border-primary bg-primary/10 text-primary'
                  : hoveredIdx === i
                  ? 'border-primary/40 bg-primary/5 text-slate-600'
                  : 'border-slate-300 bg-white text-slate-400'
              )}
            >
              {t.tokenId}
            </div>
          </div>
        ))}

        {/* ── Row 3: Arrows → Transformer ── */}
        {tokens.map((_, i) => (
          <div key={`arr1-${i}`} className="flex justify-center pt-1">
            <DownArrow />
          </div>
        ))}

        {/* ── Transformer + MLM Head card (full-width span) ── */}
        <div
          style={{ gridColumn: `1 / ${n + 1}` }}
          className="mx-4 my-1 border-2 border-slate-300 rounded-lg bg-slate-50 text-center py-3"
        >
          <p className="text-sm font-semibold text-slate-600 tracking-wide">Transformer</p>
          <p className="text-xs text-slate-400 mt-0.5">+ MLM Head</p>
        </div>

        {/* ── Row 4: Arrows → sparklines ── */}
        {tokens.map((_, i) => (
          <div key={`arr2-${i}`} className="flex justify-center pb-1">
            <DownArrow />
          </div>
        ))}

        {/* ── Row 5: Mini sparklines ── */}
        {tokens.map((t, i) => (
          <div
            key={`spark-${i}`}
            className={cn(
              'flex justify-center',
              !t.isSpecial && 'cursor-pointer'
            )}
            onClick={() => { if (!t.isSpecial) onLock(i); }}
            onMouseEnter={() => { if (!t.isSpecial) onHover(i); }}
            onMouseLeave={() => onHover(null)}
            title={t.isSpecial ? undefined : `Click to inspect "${t.token}" distribution`}
          >
            <MiniSparkline
              entries={tokenDistributions[i] ?? []}
              isHovered={hoveredIdx === i}
              isLocked={lockedIdx === i}
              isSpecial={t.isSpecial}
            />
          </div>
        ))}

        {/* ── Row 6: Label row ── */}
        {tokens.map((t, i) => (
          <div key={`lbl-${i}`} className="flex justify-center pt-1">
            <span className={cn('text-[10px] text-center px-0.5 leading-tight', t.isSpecial ? 'text-slate-300' : 'text-slate-400')}>
              {t.isSpecial ? '' : 'logits'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}