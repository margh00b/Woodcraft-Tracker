import { useState } from "react";
import { Modal, Button, Badge, Group, Tooltip, Indicator } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FaExclamationTriangle, FaCheckCircle, FaClipboardList } from "react-icons/fa";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import AddBackorderModal from "@/components/Installation/AddBOModal/AddBOModal";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";

interface BackorderManagerCellProps {
    jobId: number;
    jobNumber: string;
    className?: string;
    compact?: boolean;
}

export default function BackorderManagerCell({
    jobId,
    jobNumber,
    className,
    compact,
}: BackorderManagerCellProps) {
    const { supabase } = useSupabase();
    const [managerOpen, { open: openManager, close: closeManager }] = useDisclosure(false);
    const [addModalOpen, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);


    const { data: boStatus } = useQuery({
        queryKey: ["backorder-status", jobId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("backorders")
                .select("id, complete")
                .eq("job_id", jobId);

            if (error) return { count: 0, pending: 0 };

            return {
                count: data.length,
                pending: data.filter(bo => !bo.complete).length
            };
        },
        enabled: !!jobId,
    });

    const boCount = boStatus?.count || 0;
    const pendingCount = boStatus?.pending || 0;
    const hasPending = pendingCount > 0;

    return (
        <div className={className} onClick={(e) => e.stopPropagation()}>
            <Tooltip label={hasPending ? `${pendingCount} Pending Backorders` : boCount > 0 ? "All Backorders Complete" : "No Backorders"}>
                <Button
                    size="xs"
                    variant={hasPending ? "light" : boCount > 0 ? "outline" : "subtle"}
                    color={hasPending ? "red" : boCount > 0 ? "green" : "gray"}
                    onClick={openManager}
                    style={{ width: "100%", justifyContent: "center" }}
                >
                    {hasPending ? (
                        <Group gap={4}>
                            <FaExclamationTriangle size={12} />
                            <span>{pendingCount}</span>
                        </Group>
                    ) : (
                        <Group gap={4}>
                            {boCount > 0 ? <FaCheckCircle size={12} /> : <FaClipboardList size={12} />}
                            {boCount > 0 && <span>{boCount}</span>}
                        </Group>
                    )}
                </Button>
            </Tooltip>

            <Modal
                opened={managerOpen}
                onClose={closeManager}
                title={`Backorders - Job #${jobNumber}`}
                size="70%"
            >
                <RelatedBackorders
                    jobId={String(jobId)}
                    onAddBackorder={openAddModal}
                />
            </Modal>

            <AddBackorderModal
                opened={addModalOpen}
                onClose={closeAddModal}
                jobId={String(jobId)}
                jobNumber={jobNumber}
                onSuccess={() => {

                }}
            />
        </div>
    );
}
