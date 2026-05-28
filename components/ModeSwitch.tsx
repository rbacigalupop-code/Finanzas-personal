'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2 } from 'lucide-react';

export default function ModeSwitch() {
  const pathname = usePathname();
  const isBusiness = pathname.startsWith('/business');

  return (
    <div className="flex bg-white/20 rounded-xl p-0.5 gap-0.5">
      <Link href="/"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          !isBusiness ? 'bg-white/90 text-indigo-700 shadow-sm' : 'text-white/80 hover:text-white'
        }`}
      >
        <User size={12} /> Personal
      </Link>
      <Link href="/business"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isBusiness ? 'bg-white/90 text-emerald-700 shadow-sm' : 'text-white/80 hover:text-white'
        }`}
      >
        <Building2 size={12} /> Empresa
      </Link>
    </div>
  );
}
