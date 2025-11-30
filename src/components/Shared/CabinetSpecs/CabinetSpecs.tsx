import { Paper, Text, Grid } from "@mantine/core";
import { FaCheck } from "react-icons/fa";
import { Tables } from "@/types/db";
import { BiSolidCabinet } from "react-icons/bi";
// --- New Interface Definition ---
interface CabinetData extends Tables<"cabinets"> {
  // These fields are overwritten by the joined objects in the upstream query
  door_styles: { name: string } | null | undefined;
  species: { Species: string } | null | undefined;
  colors: { Name: string } | null | undefined;
}

interface CabinetSpecsProps {
  cabinet: CabinetData | null | undefined;
}

// --- Utility function to safely extract the string value for rendering ---
const getDisplayValue = (obj: any, key: string): string => {
  if (!obj) return "—";

  // Handle joined foreign key objects
  if (key === "species") {
    return obj.species?.Species || "—";
  }
  if (key === "color") {
    return obj.colors?.Name || "—";
  }
  if (key === "door_style") {
    return obj.door_styles?.name || "—";
  }

  // Handle direct fields (like box, interior, finish, etc.)
  return String(obj[key as keyof Tables<"cabinets">] ?? "—");
};

// --- Helper Components ---

const SpecRow = ({ label, value }: { label: string; value: string }) => (
  <Text size="sm" lh={1.4}>
    <strong>{label}:</strong> {value}
  </Text>
);

const BooleanRow = ({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) => (
  <Text
    size="sm"
    lh={1.4}
    style={{ display: "flex", alignItems: "center", gap: 6 }}
  >
    <strong>{label}:</strong>
    {value && <FaCheck color="#8e2de2" size={12} />}
  </Text>
);

const StackSpacing = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    {children}
  </div>
);

export default function CabinetSpecs({ cabinet }: CabinetSpecsProps) {
  if (!cabinet) {
    return (
      <Paper p="md" radius="md" withBorder bg="gray.0">
        <Text c="dimmed" size="sm" fs="italic">
          No cabinet specifications available.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" shadow="sm" style={{ background: "#ffffffff" }}>
      <Text
        fw={600}
        size="lg"
        mb="md"
        c="#4A00E0"
        style={{ display: "flex", alignItems: "center" }}
      >
        <BiSolidCabinet style={{ marginRight: 8 }} /> Cabinet Details
      </Text>

      <Grid>
        {/* Left Column: Standard Text Details */}
        <Grid.Col span={8}>
          <StackSpacing>
            <SpecRow label="Box" value={getDisplayValue(cabinet, "box")} />
            {/* FIX: Use getDisplayValue for Foreign Key fields */}
            <SpecRow label="Color" value={getDisplayValue(cabinet, "color")} />
            <SpecRow
              label="Finish"
              value={getDisplayValue(cabinet, "finish")}
            />
            <SpecRow
              label="Species"
              value={getDisplayValue(cabinet, "species")}
            />
            <SpecRow
              label="Interior"
              value={getDisplayValue(cabinet, "interior")}
            />
            <SpecRow
              label="Door Style"
              value={getDisplayValue(cabinet, "door_style")}
            />
            <SpecRow
              label="Top Drawer Front"
              value={getDisplayValue(cabinet, "top_drawer_front")}
            />
            <SpecRow
              label="Drawer Box"
              value={getDisplayValue(cabinet, "drawer_box")}
            />
          </StackSpacing>
        </Grid.Col>

        {/* Right Column: Booleans & Grouped Specs */}
        <Grid.Col span={4}>
          <StackSpacing>
            {/* Glass Group */}
            <div>
              <BooleanRow label="Glass" value={cabinet.glass} />
              {cabinet.glass && (
                <SpecRow
                  label="Glass Type"
                  value={getDisplayValue(cabinet, "glass_type")}
                />
              )}
            </div>

            {/* Parts Only Group */}
            <div>
              <BooleanRow
                label="Doors Parts Only"
                value={cabinet.doors_parts_only}
              />
              {cabinet.doors_parts_only && (
                <SpecRow
                  label="Piece Count"
                  value={getDisplayValue(cabinet, "piece_count")}
                />
              )}
            </div>

            <BooleanRow
              label="Handles Selected"
              value={cabinet.handles_selected}
            />
            <BooleanRow
              label="Handles Supplied"
              value={cabinet.handles_supplied}
            />
            <BooleanRow
              label="Hinge Soft Close"
              value={cabinet.hinge_soft_close}
            />
          </StackSpacing>
        </Grid.Col>
      </Grid>
    </Paper>
  );
}
