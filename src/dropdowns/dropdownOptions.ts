export const OrderTypeOptions = [
  "Single Fam",
  "Multi Fam",
  "Reno",
  "Pickup",
  "Townhouse",
  "Duplex",
];

export const TopDrawerFrontOptions = ["Matching", "Slab", "N/A"];
export const InteriorOptions = [
  "WHITE MEL",
  "PHOTO MPL",
  "GREY",
  "FIN INT",
  "BIRCH",
  "N/A",
  "WHITE PLY",
  "MAPLE PLY",
  "ALMOND",
];
export const DrawerBoxOptions = [
  "White Melamine",
  "Grey Melamine",
  "Photomaple",
  "White Metal",
  "Grey Metal",
  "Dovetail",
  "Custom",
];

export const HARDWARE_MAPPING: Record<string, string[]> = {
  "White Melamine": ["Soft Close", "Soft Close - Blum", "Standard", "Custom"],
  "Grey Melamine": ["Soft Close", "Soft Close - Blum", "Standard", "Custom"],
  Photomaple: ["Soft Close", "Soft Close - Blum", "Standard", "Custom"],
  "White Metal": ["White Metal"],
  "Grey Metal": ["Grey Metal"],
  Dovetail: ["Soft Close", "Soft Close - Blum", "Custom"],
  Custom: [
    "Soft Close",
    "Soft Close - Blum",
    "White Metal",
    "Grey Metal",
    "Standard",
    "Custom",
  ],
};

export const DeliveryTypeOptions = ["Pickup", "Delivery"];
export const flooringTypeOptions = [
  "Other",
  "Hardwood",
  "Laminate",
  "Vinyl",
  "LVP",
  "Ready",
  "Tile",
  "VinylPlank",
  "Lino",
];
export const flooringClearanceOptions = [
  `TBD`,
  `7/8'`,
  `5/8'`,
  `N/A`,
  `1/2'`,
  `Ready`,
  `3/16'`,
  `1'`,
  `1/4'`,
  `6mm`,
  `see drw`,
  `3/4'`,
  `See drwgs`,
  `6.5mm`,
  `3/16`,
  `5/16'`,
  `2mm`,
  `8mm`,
  `3/8'`,
  `5mm`,
];

export const glassTypeOptions = [
  "CLEAR",
  "PLAIN",
  "CLEAR GLASS",
  "ACID ETCH",
  "WATER GLASS",
];
export const serviceorderLocationOptions = [
  "In Bin",
  "At Wall",
  "On Desk",
  "In Office",
  "In Closet",
  "Unknown",
];
export const serviceorderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export const JobAttachmentCategoryOptions = [
  "General",
  "Service",
  "Inspection",
  "Procurement",
  "Installation",
  "Sales",
];
