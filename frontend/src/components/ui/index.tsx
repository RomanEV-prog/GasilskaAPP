import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

// ─── Button ──────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark disabled:bg-primary/50',
  secondary:
    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

// ─── Input ───────────────────────────────────────────────
// forwardRef je nujen — react-hook-form register() polje veže preko ref-a.
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <input
        ref={ref}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
});

// ─── Select ──────────────────────────────────────────────
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(function Select({ label, error, className = '', children, ...props }, ref) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <select
        ref={ref}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
});

// ─── Card ────────────────────────────────────────────────
export function Card({
  title,
  children,
  className = '',
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="font-semibold text-gray-800">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────
type BadgeColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

const badgeStyles: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
};

export function Badge({
  color = 'gray',
  children,
}: {
  color?: BadgeColor;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[color]}`}
    >
      {children}
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400">{message}</p>
  );
}

// ─── ErrorState ──────────────────────────────────────────
/** Prikaz ob neuspelem nalaganju podatkov (namesto večnega spinnerja). */
export function ErrorState({
  message = 'Podatkov ni bilo mogoče naložiti. Poskusite znova.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Poskusi znova
        </Button>
      )}
    </div>
  );
}
