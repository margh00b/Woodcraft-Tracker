export type PhotoInfo = {
  uri: string;
  mimeType: string;
};

export type OpeningEntry = {
  id: string;
  label: string;
  tag: string;
  measurement: string;
  photos: PhotoInfo[];
  isMandatory: boolean;
  isNotApplicable: boolean;
};

export type PhotoTarget = string | "generic" | null;

export type UploadTask = PhotoInfo & {
  tag: string;
  index: number;
  storagePath: string;
  fileName: string;
};

export type AttachmentPayload = {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  file_tag: string;
};

export const CHECKLIST_ITEMS = [
  { key: "cabinets_site_cleaned", label: "1) Cabinets & Site cleaned" },
  { key: "excess_material_removed", label: "2) Excess material removed" },
  { key: "final_adjustment", label: "3) Final Adjustment" },
  {
    key: "missing_materials_damages",
    label: "4) Report Missing Materials or damages",
  },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

export type ChecklistState = Record<ChecklistKey, boolean>;

export const INITIAL_CHECKLIST: ChecklistState = {
  cabinets_site_cleaned: false,
  excess_material_removed: false,
  final_adjustment: false,
  missing_materials_damages: false,
};

export const DEFAULT_OPENINGS: OpeningEntry[] = [
  {
    id: "fridge_opening",
    label: "Fridge Opening",
    tag: "Fridge Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
    isNotApplicable: false,
  },
  {
    id: "range_opening",
    label: "Range Opening",
    tag: "Range Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
    isNotApplicable: false,
  },
  {
    id: "dishwasher_opening",
    label: "Dishwasher Opening",
    tag: "Dishwasher Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
    isNotApplicable: false,
  },
  {
    id: "otr_hoodfan_opening",
    label: "OTR/Hoodfan Opening",
    tag: "OTR/Hoodfan Opening",
    measurement: "",
    photos: [],
    isMandatory: true,
    isNotApplicable: false,
  },
  {
    id: "island_location",
    label: "Island Location",
    tag: "Island Location",
    measurement: "",
    photos: [],
    isMandatory: false,
    isNotApplicable: false,
  },
];
