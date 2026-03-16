import type { CategorisedTransaction } from '@/types/transaction';

interface CategoryBadgeProps {
  categoria: CategorisedTransaction['categoria'];
}

const COLOR_MAP: Record<CategorisedTransaction['categoria'], string> = {
  Necesidades: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Deseos: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Ahorro: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

/**
 * Pure display badge for a transaction category.
 */
export default function CategoryBadge({ categoria }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[categoria]}`}
    >
      {categoria}
    </span>
  );
}
