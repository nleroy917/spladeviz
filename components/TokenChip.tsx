import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'special' | 'normal' | 'hovered' | 'locked';

type Props = {
  token: string;
  variant: Variant;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function TokenChip({ token, variant, onClick, onMouseEnter, onMouseLeave }: Props) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-mono transition-colors',
        'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        variant === 'special' &&
          'border-transparent bg-muted text-muted-foreground cursor-default opacity-50',
        variant === 'normal' &&
          'border-slate-200 bg-slate-100 text-slate-700 hover:bg-primary/5 hover:border-primary/40 cursor-pointer',
        variant === 'hovered' &&
          'border-primary/60 bg-primary/10 text-primary cursor-pointer',
        variant === 'locked' &&
          'border-primary bg-primary text-primary-foreground cursor-pointer'
      )}
    >
      {token}
      {/* {variant === 'locked' && <Pin className="h-3 w-3" />} */}
    </button>
  );
}
