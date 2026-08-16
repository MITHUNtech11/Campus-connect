import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

/** Small pill rendering a review's AI sentiment label (backend/server/api/ai.cjs). */
export default function SentimentBadge({ sentiment }: { sentiment: string }) {
  const key = sentiment.toLowerCase();
  const positive = key.startsWith('pos');
  const negative = key.startsWith('neg');
  return (
    <span
      className={cn(
        'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
        positive
          ? 'bg-emerald-100 text-emerald-700'
          : negative
            ? 'bg-red-100 text-red-700'
            : 'bg-slate-100 text-slate-700',
      )}
    >
      {positive ? (
        <ThumbsUp className="w-3 h-3" />
      ) : negative ? (
        <ThumbsDown className="w-3 h-3" />
      ) : (
        <Minus className="w-3 h-3" />
      )}
      {sentiment}
    </span>
  );
}
