"use client";

import { TAG_STYLES } from "@/components/TagChip";

interface FilterBarProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  recentlyAdded: boolean;
  onRecentlyAddedToggle: () => void;
  hideAdded: boolean;
  onHideAddedToggle: () => void;
  hideArchived: boolean;
  onHideArchivedToggle: () => void;
  isAuthenticated: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
}

const ALL_TAGS = Object.keys(TAG_STYLES);

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-headline font-bold transition-all active:scale-95 duration-200 ${
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  selectedTags,
  onTagToggle,
  recentlyAdded,
  onRecentlyAddedToggle,
  hideAdded,
  onHideAddedToggle,
  hideArchived,
  onHideArchivedToggle,
  isAuthenticated,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: FilterBarProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl px-4 py-4 space-y-3 border border-outline-variant/20">
      {/* Tag filters */}
      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          const style = TAG_STYLES[tag];
          return (
            <FilterChip key={tag} active={active} onClick={() => onTagToggle(tag)}>
              {style.label}
            </FilterChip>
          );
        })}
      </div>

      {/* Utility filters + date range */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/10">
        <FilterChip active={recentlyAdded} onClick={onRecentlyAddedToggle}>
          Recently added
        </FilterChip>
        <FilterChip active={hideAdded} onClick={onHideAddedToggle}>
          Hide added
        </FilterChip>
        {isAuthenticated && (
          <FilterChip active={hideArchived} onClick={onHideArchivedToggle}>
            Hide archived
          </FilterChip>
        )}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="text-[12px] text-on-surface bg-surface-container border border-outline-variant/30 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-[12px] text-on-surface-variant font-headline">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="text-[12px] text-on-surface bg-surface-container border border-outline-variant/30 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}
