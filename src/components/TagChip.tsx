const TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "sporting-events": { bg: "#E6F1FB", text: "#185FA5", label: "Sporting events" },
  "races-runs": { bg: "#E6F1FB", text: "#185FA5", label: "Races & runs" },
  "outdoors-nature": { bg: "#E1F5EE", text: "#0F6E56", label: "Outdoors & nature" },
  festivals: { bg: "#FAECE7", text: "#993C1D", label: "Festivals" },
  parades: { bg: "#FAECE7", text: "#993C1D", label: "Parades" },
  "great-for-kids": { bg: "#FAEEDA", text: "#854F0B", label: "Great for kids" },
  "live-music": { bg: "#EEEDFE", text: "#3C3489", label: "Live music" },
  "arts-culture": { bg: "#EEEDFE", text: "#3C3489", label: "Arts & culture" },
  "food-drink": { bg: "#E1F5EE", text: "#0F6E56", label: "Food & drink" },
  community: { bg: "#F1EFE8", text: "#5F5E5A", label: "Community" },
  education: { bg: "#F1EFE8", text: "#5F5E5A", label: "Education" },
  "pet-friendly": { bg: "#FAEEDA", text: "#854F0B", label: "Pet-friendly" },
  "seasonal-holiday": { bg: "#FAECE7", text: "#993C1D", label: "Seasonal / holiday" },
  "fundraiser-charity": { bg: "#FBEAF0", text: "#993556", label: "Fundraiser / charity" },
  "free-admission": { bg: "#EAF3DE", text: "#3B6D11", label: "Free admission" },
};

export function TagChip({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag] ?? { bg: "#F1EFE8", text: "#5F5E5A", label: tag };
  return (
    <span
      className="inline-block text-[11px] font-medium px-[7px] py-[2px] rounded-[20px]"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export { TAG_STYLES };
