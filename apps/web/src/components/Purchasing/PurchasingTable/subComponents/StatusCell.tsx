import { Menu, Badge } from "@mantine/core";
import {
  FaTruckLoading,
  FaList,
  FaCheck,
  FaExclamationCircle,
  FaTrash,
} from "react-icons/fa";

export const StatusCell = ({
  orderedAt,
  receivedAt,
  receivedIncompleteAt,
  onMarkOrdered,
  onEditOrder,
  onMarkReceived,
  onReceiveIncomplete,
  onClear,
}: {
  orderedAt: string | null;
  receivedAt: string | null;
  receivedIncompleteAt: string | null;
  onMarkOrdered: () => void;
  onEditOrder: () => void;
  onMarkReceived: () => void;
  onReceiveIncomplete: () => void;
  onClear: () => void;
}) => {
  let badgeColor = "red";
  let statusText = "—";
  let variant = "light";

  if (receivedIncompleteAt) {
    badgeColor = "orange";
    statusText = "Incomplete";
    variant = "filled";
  } else if (receivedAt) {
    badgeColor = "green";
    statusText = "Received";
    variant = "light";
  } else if (orderedAt) {
    badgeColor = "yellow";
    statusText = "Ordered";
    variant = "outline";
  }

  return (
    <Menu shadow="xl" width={240} withinPortal position="bottom-end" withArrow>
      <Menu.Target>
        <Badge
          color={badgeColor}
          variant={variant}
          size="lg"
          radius="sm"
          style={{
            cursor: "pointer",
            width: "100%",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {statusText}
        </Badge>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Change Status</Menu.Label>
        {!orderedAt && (
          <Menu.Item
            leftSection={<FaTruckLoading size={14} />}
            onClick={onMarkOrdered}
          >
            Mark Ordered (Add Parts)
          </Menu.Item>
        )}

        {orderedAt && (
          <Menu.Item leftSection={<FaList size={14} />} onClick={onEditOrder}>
            View/Edit Order Details
          </Menu.Item>
        )}

        <Menu.Item
          leftSection={<FaCheck size={14} color="green" />}
          onClick={onMarkReceived}
          disabled={!orderedAt}
        >
          Mark Received Complete
        </Menu.Item>

        <Menu.Item
          leftSection={<FaExclamationCircle size={14} color="orange" />}
          onClick={onReceiveIncomplete}
          disabled={!orderedAt}
        >
          Manage / Incomplete Receipt
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={<FaTrash size={14} />}
          onClick={onClear}
        >
          Clear All
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
