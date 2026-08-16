import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

/** The red inline error banner repeated across every page's error state. */
export default function ErrorBanner({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm',
        className,
      )}
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
