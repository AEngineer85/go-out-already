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
    <div
      className="bg-white rounded-[10px] px-3 py-3"
      style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
    >
      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          const style = TAG_STYLES[tag];
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className="px-3 py-1 rounded-[20px] text-[12px] transition-all"
              style={
                active
                  ? {
                      backgroundColor: "#E6F1FB",
                      color: "#185FA5",
                      border: "0.5px solid #93C5FD",
                      fontWeight: 500,
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "#555555",
                      border: "0.5px solid rgba(0,0,0,0.2)",
                    }
              }
            >
              {style.label}
            </button>
          );
        })}
      </div>

      {/* Divider + utility filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-px h-5 bg-black/10" />

        <button
          onClick={onRecentlyAddedToggle}
          className="px-3 py-1 rounded-[20px] text-[12px] transition-all"
          style={
            recentlyAdded
              ? {
                  backgroundColor: "#E6F1FB",
                  color: "#185FA5",
                  border: "0.5px solid #93C5FD",
                  fontWeight: 500,
                }
              : {
                  backgroundColor: "transparent",
                  color: "#555555",
                  border: "0.5px solid rgba(0,0,0,0.2)",
                }
          }
        >
          Recently added
        </button>

        <button
          onClick={onHideAddedToggle}
          className="px-3 py-1 rounded-[20px] text-[12px] transition-all"
          style={
            hideAdded
              ? {
                  backgroundColor: "#E6F1FB",
                  color: "#185FA5",
                  border: "0.5px solid #93C5FD",
                  fontWeight: 500,
                }
              : {
                  backgroundColor: "transparent",
                  color: "#555555",
                  border: "0.5px solid rgba(0,0,0,0.2)",
                }
          }
        >
          Hide added
        </button>

        {isAuthenticated && (
          <button
            onClick={onHideArchivedToggle}
            className="px-3 py-1 rounded-[20px] text-[12px] transition-all"
            style={
              hideArchived
                ? {
                    backgroundColor: "#E6F1FB",
                    color: "#185FA5",
                    border: "0.5px solid #93C5FD",
                    fontWeight: 500,
                  }
                : {
                    backgroundColor: "transparent",
                    color: "#555555",
                    border: "0.5px solid rgba(0,0,0,0.2)",
                  }
            }
          >
            Hide archived
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="text-[12px] text-[#555555] border rounded-[8px] px-2 py-1"
            style={{ borderColor: "rgba(0,0,0,0.2)" }}
          />
          <span className="text-[12px] text-[#999]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="text-[12px] text-[#555555] border rounded-[8px] px-2 py-1"
            style={{ borderColor: "rgba(0,0,0,0.2)" }}
          />
        </div>
      </div>
    </div>
  );
}
