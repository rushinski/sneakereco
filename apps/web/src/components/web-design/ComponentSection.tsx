import Link from 'next/link';

interface ComponentSectionProps {
  label: string;
  href: string;
  active?: boolean;
  comingSoon?: boolean;
  isSelected?: boolean;
}

export function ComponentSection({
  label,
  href,
  active = true,
  comingSoon = false,
  isSelected = false,
}: ComponentSectionProps) {
  if (comingSoon || !active) {
    return (
      <div className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-400">
        <span>{label}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={[
        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isSelected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
