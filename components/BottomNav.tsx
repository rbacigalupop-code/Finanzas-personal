'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ArrowLeftRight, Target, CreditCard,
  Building2, Receipt, TrendingUp, CalendarDays,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const PERSONAL_TABS = [
  { href: '/',             icon: LayoutDashboard, label: 'Inicio'      },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Movimientos' },
  { href: '/budget',       icon: Target,          label: 'Presupuesto' },
  { href: '/debts',        icon: CreditCard,      label: 'Deudas'      },
];

const BUSINESS_TABS = [
  { href: '/business',              icon: Building2,    label: 'Empresa'       },
  { href: '/business/transactions', icon: TrendingUp,   label: 'Transacciones' },
  { href: '/business/taxes',        icon: Receipt,      label: 'Impuestos'     },
  { href: '/business/calendar',     icon: CalendarDays, label: 'Calendario'    },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isBusiness = pathname.startsWith('/business');
  const tabs = isBusiness ? BUSINESS_TABS : PERSONAL_TABS;
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!isBusiness) {
      fetch('/api/alerts?count=true')
        .then((r) => r.json())
        .then((d) => setAlertCount(d.count || 0));
    }
  }, [pathname, isBusiness]);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-area-pb ${
      isBusiness ? 'border-emerald-100' : 'border-gray-200'
    }`}>
      {/* Mode indicator stripe */}
      {isBusiness && (
        <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 w-full" />
      )}
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          // Active state: exact match for root paths, startsWith for nested
          const active = href === '/'
            ? pathname === '/' && !isBusiness
            : href === '/business'
            ? pathname === '/business'
            : pathname.startsWith(href) && href !== '/';

          const isHomePersonal = href === '/' && !isBusiness;
          const showBadge = isHomePersonal && alertCount > 0;

          const activeColor = isBusiness ? 'text-emerald-600' : 'text-indigo-600';

          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? activeColor : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={label === 'Transacciones' ? 19 : 22} strokeWidth={active ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-medium leading-tight text-center ${active ? activeColor : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
