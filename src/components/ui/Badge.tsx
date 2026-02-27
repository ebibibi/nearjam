import { type HTMLAttributes } from 'react';

type Variant =
  | 'default'
  | 'verified'
  | 'unverified'
  | 'disputed'
  | 'auto'
  | 'crowdsourced'
  | 'ownerVerified'
  | 'syncroom'
  | 'genre';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  verified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  unverified: 'bg-amber-50 text-amber-700 border border-amber-200',
  disputed: 'bg-red-50 text-red-700 border border-red-200',
  auto: 'bg-blue-50 text-blue-700',
  crowdsourced: 'bg-purple-50 text-purple-700',
  ownerVerified: 'bg-emerald-50 text-emerald-700',
  syncroom: 'bg-indigo-50 text-indigo-700',
  genre: 'bg-gray-100 text-gray-600',
};

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
