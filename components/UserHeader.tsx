'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut, User } from 'lucide-react';

interface UserInfo {
  userId:      number;
  username:    string;
  displayName: string;
  isAdmin:     boolean;
}

export default function UserHeader() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user, setUser]       = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Read from x-user headers injected by middleware via a lightweight endpoint
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, [pathname]);

  // Hide on login page
  if (pathname === '/login') return null;
  if (!user) return null;

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const initials = user.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left: app brand */}
        <span className="text-sm font-semibold text-indigo-600">💰 FinanceTracker</span>

        {/* Right: user avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
              {initials}
            </span>
            <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
              {user.displayName.split(' ')[0]}
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[180px] overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-800">{user.displayName}</p>
                  <p className="text-[10px] text-gray-400">@{user.username}</p>
                </div>
                {/* Settings (admin only) */}
                {user.isAdmin && (
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/settings/users'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User size={15} className="text-gray-400" />
                    Gestionar usuarios
                  </button>
                )}
                {/* Logout */}
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <LogOut size={15} />
                  {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
