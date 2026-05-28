'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';

/** Floating action button that opens the AI advisor.
 *  Hidden on the advisor page itself. */
export default function FloatingAdvisorButton() {
  const pathname = usePathname();

  // Hide when already on the advisor page
  if (pathname === '/investments') return null;

  return (
    <Link href="/investments">
      <button
        className="fixed z-40 flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
        style={{ bottom: '76px', right: '16px' }}
        aria-label="Abrir asesor financiero IA"
      >
        {/* Pill with icon + label */}
        <span className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2.5 rounded-full shadow-indigo-300 shadow-md">
          <BrainCircuit size={16} />
          Asesor IA
        </span>
      </button>
    </Link>
  );
}
