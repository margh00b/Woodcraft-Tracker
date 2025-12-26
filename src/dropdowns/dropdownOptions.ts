export const OrderTypeOptions = [
  "Single Fam",
  "Multi Fam",
  "Reno",
  "New Const",
  "Supply",
  "Project",
  "Pickup",
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
  "Std Melamine",
  "White Metal",
  "Grey Metal",
  "Dovetail",
  "Custom",
];
export const DrawerHardwareOptions = [
  "Soft Close",
  "White Metal",
  "Grey Metal",
  "Std",
  "Custom",
];
export const HARDWARE_MAPPING: Record<string, string[]> = {
  "Std Melamine": ["Soft Close", "Std", "Custom"],
  "White Metal": ["White Metal"],
  "Grey Metal": ["Grey Metal"],
  "Dovetail": ["Soft Close", "Custom"],
  "Custom": ["Soft Close", "White Metal", "Grey Metal", "Std", "Custom"],
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
