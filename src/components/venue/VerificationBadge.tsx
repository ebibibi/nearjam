import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';

interface VerificationBadgeProps {
  verifiedAt: Date | null;
  disputedAt: Date | null;
}

export function VerificationBadge({ verifiedAt, disputedAt }: VerificationBadgeProps) {
  const t = useTranslations('venue');

  if (disputedAt) {
    return <Badge variant="disputed">🔒 {t('disputed')}</Badge>;
  }
  if (verifiedAt) {
    return <Badge variant="verified">✅ {t('verified')}</Badge>;
  }
  return <Badge variant="unverified">⚠️ {t('unverified')}</Badge>;
}
