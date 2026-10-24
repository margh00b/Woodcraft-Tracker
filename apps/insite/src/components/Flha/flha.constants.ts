export const HAZARD_CATEGORIES = [
  { key: "access_stairs_exits", label: "1) Access, stairs, and exits" },
  { key: "tools_and_equipment", label: "2) Tools and equipment" },
  {
    key: "vehicles_traffic_stacking",
    label: "3) Vehicles, Traffic and Material Stacking",
  },
  { key: "manual_handling_lifting", label: "4) Manual Handling and Lifting" },
  { key: "housekeeping_on_site", label: "5) Housekeeping on site" },
  { key: "chemicals", label: "6) Chemicals" },
  { key: "ladders_work_at_height", label: "7) Ladders and work at height" },
  {
    key: "weather_lighting_working_alone",
    label: "8) Weather, lighting or working alone",
  },
  {
    key: "other_trades_public_hazard",
    label: "9) Other Trades, public or site hazard",
  },
] as const;

export type HazardRating = "acceptable" | "low" | "medium" | "high" | "n/a";

export const RATINGS: {
  label: string;
  value: HazardRating;
  color: string;
  activeColor: string;
}[] = [
  {
    label: "Acc",
    value: "acceptable",
    color: "border-emerald-200 text-emerald-700 bg-emerald-50",
    activeColor: "bg-emerald-600 border-emerald-600 text-white",
  },
  {
    label: "Low",
    value: "low",
    color: "border-blue-200 text-blue-700 bg-blue-50",
    activeColor: "bg-blue-600 border-blue-600 text-white",
  },
  {
    label: "Med",
    value: "medium",
    color: "border-amber-200 text-amber-700 bg-amber-50",
    activeColor: "bg-amber-600 border-amber-600 text-white",
  },
  {
    label: "High",
    value: "high",
    color: "border-rose-200 text-rose-700 bg-rose-50",
    activeColor: "bg-rose-600 border-rose-600 text-white",
  },
  {
    label: "N/A",
    value: "n/a",
    color: "border-slate-200 text-slate-600 bg-slate-100",
    activeColor: "bg-slate-700 border-slate-700 text-white",
  },
];

export const DEFAULT_HAZARD_RATINGS: Record<string, HazardRating> = {
  access_stairs_exits: "n/a",
  tools_and_equipment: "n/a",
  vehicles_traffic_stacking: "n/a",
  manual_handling_lifting: "n/a",
  housekeeping_on_site: "n/a",
  chemicals: "n/a",
  ladders_work_at_height: "n/a",
  weather_lighting_working_alone: "n/a",
  other_trades_public_hazard: "n/a",
};
