import { Paper, Text, Grid } from "@mantine/core";
import { FaCheck } from "react-icons/fa";
import { Tables } from "@/types/db";
import { BiSolidCabinet } from "react-icons/bi";
import { colors } from "@/theme";
interface CabinetData extends Tables<"cabinets"> {
  door_styles: { name: string } | null | undefined;
  species: { Species: string } | null | undefined;
  colors: { Name: string } | null | undefined;
}

interface CabinetSpecsProps {
  cabinet: CabinetData | null | undefined;
}

const getDisplayValue = (obj: any, key: string): string => {
  if (!obj) return "—";

  if (key === "species") {
    return obj.species?.Species || "—";
  }
  if (key === "color") {
    return obj.colors?.Name || "—";
  }
  if (key === "door_style") {
    return obj.door_styles?.name || "—";
  }

  return String(obj[key as keyof Tables<"cabinets">] ?? "—");
};

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
    {value && <FaCheck color={colors.violet.secondary} size={12} />}
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
        c={colors.violet.primary}
        style={{ display: "flex", alignItems: "center" }}
      >
        <BiSolidCabinet style={{ marginRight: 8 }} /> Cabinet Details
      </Text>

      <Grid>
        {}
        <Grid.Col span={7}>
          <StackSpacing>
            <SpecRow label="Box" value={getDisplayValue(cabinet, "box")} />
            {}
            <SpecRow label="Color" value={getDisplayValue(cabinet, "color")} />

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
            <SpecRow
              label="Drawer Hardware"
              value={getDisplayValue(cabinet, "drawer_hardware")}
            />
          </StackSpacing>
        </Grid.Col>

        {}
        <Grid.Col span={5}>
          <StackSpacing>
            {}
            <div>
              {cabinet.glass && (
                <BooleanRow label="Glass" value={cabinet.glass} />
              )}
              {cabinet.glass && (
                <SpecRow
                  label="Glass Type"
                  value={getDisplayValue(cabinet, "glass_type")}
                />
              )}
            </div>

            {}
            <div>
              {cabinet.doors_parts_only && (
                <BooleanRow
                  label="Doors Parts Only"
                  value={cabinet.doors_parts_only}
                />
              )}
              {cabinet.doors_parts_only && (
                <SpecRow
                  label="Piece Count"
                  value={getDisplayValue(cabinet, "piece_count")}
                />
              )}
            </div>
            {cabinet.handles_selected && (
              <BooleanRow
                label="Handles Selected"
                value={cabinet.handles_selected}
              />
            )}
            {cabinet.handles_supplied && (
              <BooleanRow
                label="Handles Supplied"
                value={cabinet.handles_supplied}
              />
            )}
          </StackSpacing>
        </Grid.Col>
      </Grid>
    </Paper>
  );
}
