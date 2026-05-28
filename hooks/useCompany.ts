'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Company {
  id: number;
  name: string;
  legal_type: string;
  rut?: string;
  color: string;
  icon: string;
  is_active: number;
}

const STORAGE_KEY = 'activeCompanyId';

export function useCompany() {
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [activeId, setActiveIdState] = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);

  const reload = useCallback(async () => {
    const res  = await fetch('/api/business/companies');
    const data: Company[] = await res.json();
    setCompanies(data);

    const stored  = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const storedId = stored ? parseInt(stored) : null;

    if (storedId && data.find((c) => c.id === storedId)) {
      setActiveIdState(storedId);
    } else if (data.length > 0) {
      setActiveIdState(data[0].id);
      localStorage.setItem(STORAGE_KEY, String(data[0].id));
    } else {
      setActiveIdState(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function setActiveId(id: number) {
    setActiveIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  const activeCompany = companies.find((c) => c.id === activeId) ?? null;

  return { companies, activeCompany, activeId, setActiveId, loading, reload };
}
