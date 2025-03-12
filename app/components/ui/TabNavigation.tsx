import Link from 'next/link';

interface TabItem {
  name: string;
  href: string;
  current: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
}

export default function TabNavigation({ tabs }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs
              ${tab.current
                ? 'border-[#008DC1] text-gray-900 font-bold'
                : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'}
            `}
            aria-current={tab.current ? 'page' : undefined}
          >
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
