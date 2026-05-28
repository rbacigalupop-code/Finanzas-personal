import TransactionForm from '@/components/TransactionForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTransaction() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo movimiento</h1>
      </div>
      <TransactionForm />
    </div>
  );
}
