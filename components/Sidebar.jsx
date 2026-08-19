'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV } from '@/config/nav';
import Icon from './Icon';
import { useScope } from './ScopeContext';

export default function Sidebar({ collapsed }) {
  const pathname = usePathname();
  const { user } = useScope();
  const [open, setOpen] = useState(null);

  /* keep the parent of the current route expanded, like the original */
  useEffect(() => {
    const idx = NAV.findIndex(
      (n) => n.children && n.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))
    );
    if (idx >= 0) setOpen(idx);
  }, [pathname]);

  return (
    <aside
      className={
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar text-sidebar-text ' +
        (collapsed ? 'w-0 overflow-hidden' : 'w-sidebar')
      }
    >
      <div className="flex items-center gap-3.5 px-5 py-[22px]">
        <span className="relative h-[34px] w-[34px] rounded-full bg-[#6d7789]">
          <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-[#2ecc71]" />
        </span>
        <span className="text-[17px] font-bold text-white">{user?.name || 'Loading...'}</span>
      </div>

      <nav className="sb-nav flex-1 overflow-y-auto pb-8">
        {NAV.map((item, i) => {
          const hasKids = Array.isArray(item.children);
          const isOpen = open === i;
          const isActive = item.href
            ? pathname === item.href
            : (item.children || []).some((c) => pathname === c.href);

          if (!hasKids) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={'sb-item ' + (isActive ? 'sb-item-active' : '')}
              >
                <Icon name={item.icon} size={20} />
                <span className="flex-1">{item.label}</span>
                <Icon name="chevR" size={13} />
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className={'sb-item ' + (isOpen || isActive ? 'sb-item-active' : '')}
              >
                <Icon name={item.icon} size={20} />
                <span className="flex-1">{item.label}</span>
                <Icon name={isOpen ? 'chevL' : 'chevR'} size={13} />
              </button>

              {isOpen && item.children.length > 0 && (
                <div className="pb-2 pt-0.5">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={
                        'sb-sub-link ' +
                        (pathname === c.href || pathname.startsWith(c.href + '/') ? 'sb-sub-link-active' : '')
                      }
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
