'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, Target, CreditCard, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';

const tabs = [
  { href: '/',             icon: LayoutDashboard, label: 'Inicio'      },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Movimientos' },
  { href: '/budget',       icon: Target,          label: 'Presupuesto' },
  { href: '/debts',        icon: CreditCard,      label: 'Deudas'      },
  { href: '/investments',  icon: BrainCircuit,    label: 'Asesor'      },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch('/api/alerts?count=true')
      .then((r) => r.json())
      .then((d) => setAlertCount(d.count || 0));
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          const isHome = href === '/';
          const showBadge = isHome && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
