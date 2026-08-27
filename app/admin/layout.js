'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ChatBot from '@/components/ChatBot';
import { ScopeProvider } from '@/components/ScopeContext';

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ScopeProvider>
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} />
        <div className={'min-w-0 flex-1 ' + (collapsed ? 'ml-0' : 'ml-sidebar')}>
          <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />
          <main className="px-5 pb-14 pt-4">{children}</main>
        </div>
      </div>

      {/* Signed-in screens only - deliberately not in the root layout, so it
          stays off the marketing landing page and /login. Mounted here rather
          than per-page so its transcript survives navigation between screens. */}
      <ChatBot />
    </ScopeProvider>
  );
}
