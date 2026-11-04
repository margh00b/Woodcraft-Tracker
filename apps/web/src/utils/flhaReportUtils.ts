export const FLHA_HAZARD_CATEGORIES = [
  { key: "access_stairs_exits", label: "1) Access, stairs, and exits" },
  { key: "tools_and_equipment", label: "2) Tools and equipment" },
  { key: "vehicles_traffic_stacking", label: "3) Vehicles, traffic and material stacking" },
  { key: "manual_handling_lifting", label: "4) Manual handling and lifting" },
  { key: "housekeeping_on_site", label: "5) Housekeeping on site" },
  { key: "chemicals", label: "6) Chemicals" },
  { key: "ladders_work_at_height", label: "7) Ladders and work at height" },
  { key: "weather_lighting_working_alone", label: "8) Weather, lighting or working alone" },
  { key: "other_trades_public_hazard", label: "9) Other trades, public or site hazard" },
] as const;

export const FLHA_RATING_LABELS: Record<string, string> = {
  acceptable: "Acceptable",
  low: "Low",
  medium: "Medium",
  high: "High",
  "n/a": "N/A",
};
