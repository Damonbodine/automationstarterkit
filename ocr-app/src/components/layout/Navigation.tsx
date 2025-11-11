'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mail,
  FileText,
  CheckSquare,
  Settings,
  LogOut
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/projects', label: 'Projects', icon: FileText },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/agents', label: 'Agents', icon: Settings },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              EmailAI
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex md:space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-200 max-w-[160px] truncate">
                {session.user?.email}
              </span>
              <Avatar name={session.user?.name} email={session.user?.email} />
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap',
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
