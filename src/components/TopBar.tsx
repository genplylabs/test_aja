import React from 'react';
import { Download } from 'lucide-react';
import { EditorTab } from '../types/story';

interface TopBarProps {
  activeTab: EditorTab;
  onSelectTab: (tab: EditorTab) => void;
  onExportZip: () => void;
  isExporting: boolean;
}

const NAV_TABS: { id: EditorTab; label: string }[] = [
  { id: 'assets', label: 'Assets & Atlas' },
  { id: 'graph', label: 'Story Graph' },
  { id: 'timeline', label: 'Timeline & Camera' },
  { id: 'playback', label: 'Playback Engine' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onExportZip,
  isExporting,
}) => {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-6 bg-[#0B0D12] border-b border-white/[0.08]">
      {/* Zone 1: Single-line Brand Wordmark */}
      <span className="font-display text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
        Kinesis Studio
      </span>

      {/* Zone 2: Clean single-line workspace navigation links */}
      <nav
        aria-label="Workspace navigation"
        className="flex items-center gap-6 overflow-x-auto"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary export action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportZip}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isExporting ? 'Exporting ZIP...' : 'Export Story ZIP'}</span>
        </button>
      </div>
    </header>
  );
};
