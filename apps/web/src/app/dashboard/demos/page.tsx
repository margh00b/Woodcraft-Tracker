"use client";

import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Group,
    Stack,
    TextInput,
    Select,
    SimpleGrid,
    Fieldset,
    Switch,
    Button,
    Collapse,
    Text,
    Divider,
    Grid,
    GridCol,
    ThemeIcon,
    Badge,
    Transition,
    Box,
    ActionIcon,
    Progress,
    Center,
    Tooltip
} from '@mantine/core';
import {
    FaCheckCircle,
    FaCircle,
    FaInfoCircle,
    FaCopy,
    FaPlay,
    FaPause,
    FaRedo,
    FaChevronLeft,
    FaChevronRight,
    FaLightbulb
} from "react-icons/fa";
import { useInterval } from '@mantine/hooks';


type StepPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type GuideStep = {
    id: number;
    title: string;
    description: string;
    action: () => void;
    targetId?: string;
    position: StepPosition;
};

const ORDER_TYPES = [
    "Single Fam",
    "Multi Fam",
    "Reno",
    "New Const",
    "Supply",
    "Project",
    "Pickup"
];

const MOCK_PROJECT_DATA: Record<string, any> = {
    'Sunset Ridge Condos': {
        street: '1234 Ridge View Blvd',
        city: 'Calgary',
        province: 'AB',
        zip: 'T3Z 2X1',
        phone_1: '(403) 555-0199',
        email_1: 'site@skyline.ca',
        contact: 'John Foreman'
    }
};

export default function SmartAutofillGuide() {
    const [orderType, setOrderType] = useState<string | null>(null);
    const [stage, setStage] = useState('QUOTE');
    const [jobBase, setJobBase] = useState('');
    const [jobSuffix, setJobSuffix] = useState('');
    const [client, setClient] = useState('');
    const [projectName, setProjectName] = useState<string | null>('');
    const [shippingDetails, setShippingDetails] = useState({
        street: '',
        city: '',
        province: '',
        zip: '',
        phone_1: '',
        email_1: '',
        client_name: ''
    });
    const [unitNumber, setUnitNumber] = useState('');

    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const resetForm = () => {
        setOrderType(null);
        setStage('QUOTE');
        setJobBase('');
        setJobSuffix('');
        setClient('');
        setProjectName('');
        setShippingDetails({ street: '', city: '', province: '', zip: '', phone_1: '', email_1: '', client_name: '' });
    };

    const steps: GuideStep[] = [
        {
            id: 0,
            title: "Introduction",
            description: "Welcome to the Smart Autofill Guide. Watch how the system automates Multi-Family data entry.",
            action: () => resetForm(),
            position: 'center'
        },
        {
            id: 1,
            title: "Select Order Type",
            description: "Select 'Multi Fam' from the dropdown",
            action: () => setOrderType('Multi Fam'),
            targetId: 'order-type-select',
            position: 'top-left'
        },
        {
            id: 2,
            title: "Start a 'Sold' Order",
            description: "Toggle the stage to 'Sold'.",
            action: () => {
                setStage('SOLD');
            },
            targetId: 'stage-switch',
            position: 'top-left'
        },
        {
            id: 3,
            title: "Enter Job Number",
            description: "Type the main Job Number (e.g., 40500).",
            action: () => setJobBase('40500'),
            targetId: 'job-base-input',
            position: 'top-left'
        },
        {
            id: 4,
            title: "Automatic Variant & Client",
            description: "The system detects 40500-A exists, auto-fills 'B', pulls the Client, and pre-fills the Shipping Client Name.",
            action: () => {
                setJobBase('40500');
                setJobSuffix('B');
                setClient('Skyline Builders');
                setShippingDetails(prev => ({ ...prev, client_name: 'Skyline Builders' }));
            },
            targetId: 'variant-group',
            position: 'top-right'
        },
        {
            id: 5,
            title: "Select Project",
            description: "In Shipping Details, select a Project Name to trigger the autofill.",
            action: () => { },
            targetId: 'project-select',
            position: 'bottom-right'
        },
        {
            id: 6,
            title: "Instant Data Fill",
            description: "Selecting 'Sunset Ridge' instantly pulls the address and site contact info.",
            action: () => {
                setProjectName('Sunset Ridge Condos');
                const data = MOCK_PROJECT_DATA['Sunset Ridge Condos'];
                setShippingDetails(prev => ({
                    ...prev,
                    ...data
                }));
            },
            targetId: 'shipping-fieldset',
            position: 'bottom-right'
        },
        {
            id: 7,
            title: "Process Sale",
            description: "The order is ready to be processed with zero manual data entry errors.",
            action: () => { },
            position: 'center'
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            steps[nextStep].action();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1;
            setCurrentStep(prevStep);
            if (prevStep === 0) resetForm();
            else steps[prevStep].action();
        }
    };

    const handleRestart = () => {
        setCurrentStep(0);
        resetForm();
        setIsPlaying(false);
    };

    const interval = useInterval(() => {
        if (currentStep < steps.length - 1) {
            handleNext();
        } else {
            setIsPlaying(false);
        }
    }, 2500);

    useEffect(() => {
        if (isPlaying) interval.start();
        else interval.stop();
        return interval.stop;
    }, [isPlaying]);

    const activeStepData = steps[currentStep];
    const isHighlighted = (id: string) => activeStepData.targetId === id;

    const getModalStyles = (pos: StepPosition) => {
        const baseStyles: React.CSSProperties = { position: 'absolute', zIndex: 1000, width: 320 };
        switch (pos) {
            case 'center': return { ...baseStyles, top: '40%', left: '50%', transform: 'translate(-50%, -50%)' };
            case 'top-left': return { ...baseStyles, top: '160px', left: '20px' };
            case 'top-right': return { ...baseStyles, top: '160px', right: '20px' };
            case 'bottom-left': return { ...baseStyles, bottom: '120px', left: '20px' };
            case 'bottom-right': return { ...baseStyles, bottom: '120px', right: '20px' };
            default: return baseStyles;
        }
    };

    return (
        <div className="relative h-screen flex flex-col overflow-hidden font-sans bg-gray-50">

            {}
            <Paper
                radius={0}
                p="sm"
                className="bg-white z-50 relative border-b border-gray-200 shadow-sm"
                h={70}
            >
                <div className="flex items-center justify-between h-full px-2 relative">

                    {}
                    <Group gap="sm">
                        <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                            <FaLightbulb size={18} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size="sm" lh={1.1} c="dark">Smart Autofill Demo</Text>
                            <Text size="xs" c="dimmed">Step {currentStep + 1} of {steps.length}</Text>
                        </Box>
                    </Group>

                    {}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Group gap={6} bg="gray.0" p={4} className="rounded-lg border border-gray-200 shadow-sm">
                            <Tooltip label="Previous" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                >
                                    <FaChevronLeft size={14} />
                                </ActionIcon>
                            </Tooltip>

                            <Button
                                onClick={() => setIsPlaying(!isPlaying)}
                                size="xs"
                                radius="md"
                                leftSection={isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
                                className="transition-all w-28"
                                style={{
                                    background: isPlaying
                                        ? 'linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)'
                                        : 'linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)',
                                    border: 'none'
                                }}
                            >
                                {isPlaying ? 'Pause' : 'Play Demo'}
                            </Button>

                            <Tooltip label="Next" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={currentStep === steps.length - 1}
                                >
                                    <FaChevronRight size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </div>

                    {}
                    <Tooltip label="Restart Demo" withArrow>
                        <ActionIcon
                            variant="light"
                            color="gray"
                            size="lg"
                            radius="md"
                            onClick={handleRestart}
                        >
                            <FaRedo size={16} />
                        </ActionIcon>
                    </Tooltip>
                </div>

                {}
                <Progress
                    value={((currentStep + 1) / steps.length) * 100}
                    size={3}
                    mt="xs"
                    radius={0}
                    className="absolute bottom-0 left-0 right-0"
                    color="blue"
                />
            </Paper>

            {}
            <Transition mounted={true} transition="pop" duration={400} timingFunction="ease-out">
                {(styles) => (
                    <Paper
                        style={{
                            ...styles,
                            ...getModalStyles(activeStepData.position),
                            backdropFilter: 'blur(12px)',
                        }}
                        shadow="xl"
                        withBorder

                        bg="rgba(244, 238, 255, 1)"
                        radius="lg"
                        p="lg"
                    >
                        <Group mb="xs" justify="space-between">
                            <Text fw={800} c="blue.8" size="lg" style={{ letterSpacing: '-0.5px' }}>
                                {activeStepData.title}
                            </Text>
                            <Badge variant="filled" color="dark" size="sm">
                                {currentStep + 1} / {steps.length}
                            </Badge>
                        </Group>
                        <Text size="sm" c="dark.9" fw={500} lh={1.6}>
                            {activeStepData.description}
                        </Text>
                    </Paper>
                )}
            </Transition>

            {}
            <Container
                size="100%"
                pl={10}
                w={"100%"}
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    paddingRight: 0,
                    background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflowY: "auto",
                        paddingBottom: '80px'
                    }}
                >
                    <Stack gap={5} p="md">

                        {}
                        <Paper withBorder p="md" radius="md" shadow="xl">
                            <Grid gutter="xl" align="flex-end" justify="space-between">
                                <GridCol span={6}>
                                    <Group align="flex-end" wrap="nowrap">
                                        <Box className={isHighlighted('order-type-select') ? 'ring-4 ring-yellow-400 rounded transition-all duration-300' : ''}>
                                            <Select
                                                label="Order Type"
                                                withAsterisk
                                                placeholder="Type"
                                                data={ORDER_TYPES}
                                                value={orderType}
                                                onChange={setOrderType}
                                                style={{ width: 180 }}
                                            />
                                        </Box>

                                        <Box className={isHighlighted('stage-switch') ? 'ring-4 ring-yellow-400 rounded-full transition-all duration-300' : ''}>
                                            <Switch
                                                offLabel="Quote"
                                                onLabel="Sold"
                                                size="xl"
                                                thumbIcon={<FaCheckCircle />}
                                                styles={{
                                                    track: {
                                                        cursor: "pointer",
                                                        background:
                                                            stage === "SOLD"
                                                                ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                                                                : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                                                        color: "white",
                                                        border: "none",
                                                        padding: "0 0.2rem",
                                                        width: "6rem",
                                                    },
                                                    thumb: {
                                                        background:
                                                            stage === "SOLD" ? "#218838" : "#4a00e0",
                                                    },
                                                }}
                                                checked={stage === "SOLD"}
                                                onChange={(e) => setStage(e.currentTarget.checked ? 'SOLD' : 'QUOTE')}
                                            />
                                        </Box>

                                        <Collapse in={stage === "SOLD"} transitionDuration={300}>
                                            <Group gap="xs" align="flex-end" style={{ flex: 1 }}>
                                                <Box className={isHighlighted('job-base-input') ? 'ring-4 ring-yellow-400 rounded transition-all duration-300' : ''}>
                                                    <TextInput
                                                        label="Job Number"
                                                        placeholder="40000..."
                                                        value={jobBase}
                                                        onChange={(e) => setJobBase(e.target.value)}
                                                        style={{ width: 120 }}
                                                        withAsterisk
                                                    />
                                                </Box>

                                                <Box className={isHighlighted('variant-group') ? 'ring-4 ring-yellow-400 rounded transition-all duration-300' : ''}>
                                                    <TextInput
                                                        label="Variant"
                                                        placeholder="A, B..."
                                                        value={jobSuffix}
                                                        readOnly
                                                        style={{ width: 80 }}
                                                        rightSection={
                                                            jobSuffix ? (
                                                                <ThemeIcon size="xs" color="orange" variant="light">
                                                                    <FaInfoCircle size={10} />
                                                                </ThemeIcon>
                                                            ) : null
                                                        }
                                                    />
                                                </Box>
                                            </Group>
                                        </Collapse>
                                    </Group>
                                </GridCol>

                                <GridCol span={5}>
                                    <Group align="flex-end" w="100%">
                                        <Select
                                            label="Client"
                                            placeholder="Search clients..."
                                            data={['Skyline Builders']}
                                            searchable
                                            value={client}
                                            rightSection={null}
                                            style={{ flex: 1 }}
                                            readOnly
                                        />

                                        <Switch
                                            onLabel="Memo"
                                            offLabel="Memo"
                                            size="xl"
                                            thumbIcon={<FaCircle />}
                                            checked={false}
                                            disabled
                                            styles={{
                                                track: {
                                                    cursor: "not-allowed",
                                                    background: "linear-gradient(135deg, #ddddddff 0%, #dadadaff 100%)",
                                                    color: "black",
                                                    border: "none",
                                                    padding: "0 0.2rem",
                                                    width: "6rem",
                                                },
                                                thumb: {
                                                    background: "#ffffffff",
                                                },
                                                root: {
                                                    display: "flex",
                                                    alignItems: "flex-end",
                                                    justifyContent: "flex-end",
                                                },
                                            }}
                                        />
                                    </Group>
                                </GridCol>
                            </Grid>
                        </Paper>

                        {}
                        {client ? (
                            <SimpleGrid
                                cols={{ base: 1, lg: 2 }}
                                spacing="md"
                                bg={"gray.1"}
                                p="10px"
                                style={{ borderRadius: '8px' }}
                            >
                                <Fieldset legend="Billing Details" variant="filled" bg={"white"}>
                                    <Stack gap="sm">
                                        <Stack gap={0}>
                                            <Text size="xs" c="dimmed">Client Name</Text>
                                            <Text fw={600} size="sm">{client}</Text>
                                        </Stack>
                                        <SimpleGrid cols={2} spacing="md">
                                            <Stack gap={0}>
                                                <Text size="xs" c="dimmed">Phone 1</Text>
                                                <Text fw={500} size="sm">(403) 555-0123</Text>
                                            </Stack>
                                            <Stack gap={0}>
                                                <Text size="xs" c="dimmed">Email 1</Text>
                                                <Text fw={500} size="sm">accounts@skyline.ca</Text>
                                            </Stack>
                                        </SimpleGrid>
                                        <Divider my={2} />
                                        <Stack gap="xs">
                                            <Text size="xs" c="dimmed">Billing Address</Text>
                                            <Text fw={500} size="sm" mt={-5}>
                                                8800 Industrial Way, Calgary, AB T2C 4M2
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Fieldset>

                                <Box className={isHighlighted('shipping-fieldset') || isHighlighted('project-select') ? 'ring-4 ring-yellow-400 rounded-lg transition-all duration-300' : ''}>
                                    <Fieldset legend="Shipping Details" variant="filled" bg={"white"}>
                                        <Stack gap="sm">
                                            <Group justify="space-between">
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<FaCopy />}
                                                    style={{
                                                        background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                                                        color: "white",
                                                        border: "none",
                                                    }}
                                                >
                                                    Copy from Billing
                                                </Button>
                                                {projectName && (
                                                    <Text size="xs" c="dimmed" fs="italic">
                                                        * Autofilled from Job #40500-A
                                                    </Text>
                                                )}
                                            </Group>
                                            <SimpleGrid cols={2} spacing="sm">
                                                <TextInput
                                                    label="Client Name"
                                                    value={shippingDetails.client_name}
                                                    readOnly
                                                />
                                                <Box className={isHighlighted('project-select') ? 'ring-4 ring-yellow-400 rounded transition-all duration-300' : ''}>
                                                    <Select
                                                        label="Project Name"
                                                        placeholder="Project Name..."
                                                        data={['Sunset Ridge Condos', 'Lakeside Vistas']}
                                                        value={projectName}
                                                        onChange={setProjectName}
                                                    />
                                                </Box>
                                            </SimpleGrid>
                                            <Grid>
                                                <GridCol span={1.5}>
                                                    <TextInput
                                                        label="Unit #"
                                                        placeholder="123.."
                                                        value={unitNumber}
                                                        onChange={(e) => setUnitNumber(e.currentTarget.value)}
                                                    />
                                                </GridCol>
                                                <GridCol span={4.5}>
                                                    <TextInput
                                                        label="Street Address"
                                                        value={shippingDetails.street}
                                                        readOnly
                                                    />
                                                </GridCol>
                                                <GridCol span={2}>
                                                    <TextInput label="City" value={shippingDetails.city} readOnly />
                                                </GridCol>
                                                <GridCol span={2}>
                                                    <TextInput label="Province" value={shippingDetails.province} readOnly />
                                                </GridCol>
                                                <GridCol span={2}>
                                                    <TextInput label="Zip" value={shippingDetails.zip} readOnly />
                                                </GridCol>
                                            </Grid>
                                            <SimpleGrid cols={2} spacing="sm">
                                                <TextInput label="Phone 1" value={shippingDetails.phone_1} readOnly />
                                                <TextInput label="Email 1" value={shippingDetails.email_1} readOnly />
                                            </SimpleGrid>
                                        </Stack>
                                    </Fieldset>
                                </Box>
                            </SimpleGrid>
                        ) : (
                            <Center style={{ height: "100px", borderRadius: '8px' }} bg={"white"}>
                                <Text c="dimmed" size="sm">
                                    Please select a Client to view billing details.
                                </Text>
                            </Center>
                        )}

                        {}
                        <Paper withBorder p="md" bg={"gray.1"} opacity={0.5} style={{ pointerEvents: 'none' }}>
                            <Center h={100}><Text c="dimmed">Additional Form Fields (Cabinet Specs, Financials, etc.)</Text></Center>
                        </Paper>

                    </Stack>
                </div>

                {}
                <Paper
                    withBorder
                    p="md"
                    radius="md"
                    pos="sticky"
                    bottom={0}
                    style={{ zIndex: 40 }}
                >
                    <Group justify="flex-end">
                        <Button
                            size="md"
                            variant="outline"
                            style={{
                                background: "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
                                color: "white",
                                border: "none",
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="md"
                            style={{
                                background:
                                    stage === "SOLD"
                                        ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                                        : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                                color: "white",
                                border: "none",
                            }}
                        >
                            {stage === "SOLD" ? "Process Sale" : "Save Quote"}
                        </Button>
                    </Group>
                </Paper>
            </Container>
        </div>
    );
}