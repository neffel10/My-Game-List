'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';

type AdminTab = 'default' | 'fan-art' | 'rewards';
const AdminTabContext = createContext<AdminTab>('default');

const labels: Record<AdminTab, string> = {
  default: 'Default',
  'fan-art': 'Fan Art',
  rewards: 'Rewards Catalog',
};

export function AdminHubTabs({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('default');
  const { t } = useLanguage();
  return (
    <AdminTabContext.Provider value={activeTab}>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-zinc-900/70 p-2" role="tablist" aria-label="Admin Hub sections">
        {(Object.keys(labels) as AdminTab[]).map((tab) => (
          <button
            key={tab}
            id={`admin-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`admin-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
          >
            {t(labels[tab])}
          </button>
        ))}
      </div>
      {children}
    </AdminTabContext.Provider>
  );
}

export function AdminHubPanel({ tab, children }: { tab: AdminTab; children: ReactNode }) {
  const activeTab = useContext(AdminTabContext);
  return (
    <div
      id={`admin-panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`admin-tab-${tab}`}
      hidden={activeTab !== tab}
      className="space-y-8"
    >
      {children}
    </div>
  );
}
