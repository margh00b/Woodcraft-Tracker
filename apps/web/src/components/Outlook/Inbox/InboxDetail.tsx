import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Text,
  Group,
  Avatar,
  Divider,
  Paper,
  Title,
  Stack,
  Button,
  Loader,
  Checkbox,
  Modal,
  Select,
  ScrollArea,
  SimpleGrid,
  ThemeIcon,
  Switch,
  Collapse,
  Container,
  ActionIcon,
  Image,
} from "@mantine/core";
import { OutlookEmail, OutlookAttachment, useOutlook } from "./useOutlook";
import dayjs from "dayjs";
import {
  FaPaperclip,
  FaDownload,
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { notifications } from "@mantine/notifications";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useJobAttachments } from "@/hooks/useJobAttachments";
import { JobAttachmentCategoryOptions } from "@/dropdowns/dropdownOptions";

interface InboxDetailProps {
  email: OutlookEmail;
  defaultJobId?: number;
}

const cleanBodyProperties = (doc: Document) => {
  const replyDiv = doc.getElementById("divRplyFwdMsg");
  if (replyDiv) replyDiv.remove();

  const gmailQuote = doc.querySelector(".gmail_quote");
  if (gmailQuote) gmailQuote.remove();

  return doc.body.innerHTML;
};

const getFileIcon = (contentType: string) => {
  if (contentType.includes("pdf")) return <FaFilePdf color="#fa5252" />;
  if (contentType.includes("image")) return <FaFileImage color="#228be6" />;
  return <FaFileAlt color="gray" />;
};

function ThreadMessage({
  email,
  isOpen,
  onToggle,
  onAttachmentsLoaded,
  isLatest,
  onUpload,
}: {
  email: OutlookEmail;
  isOpen: boolean;
  onToggle: () => void;
  onAttachmentsLoaded: (
    id: string,
    atts: OutlookAttachment[],
    sigIds: string[]
  ) => void;
  isLatest: boolean;
  onUpload: (atts: OutlookAttachment[]) => void;
}) {
  const { fetchEmailDetails, fetchAttachments } = useOutlook({
    manualFetch: true,
  });
  const [processedBody, setProcessedBody] = useState<string>("");
  const [rawBody, setRawBody] = useState<string>("");
  const [attachments, setAttachments] = useState<OutlookAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [needsAttachments, setNeedsAttachments] = useState(false);
  const [signatureIds, setSignatureIds] = useState<string[]>([]);
  const loadingAttachmentsRef = useRef(false);

  const processBody = useCallback(
    (content: string, atts: OutlookAttachment[]) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");

        const replyDiv = doc.getElementById("divRplyFwdMsg");
        if (replyDiv) replyDiv.remove();
        const gmailQuote = doc.querySelector(".gmail_quote");
        if (gmailQuote) gmailQuote.remove();

        const cidMap = new Map<string, string>();
        const sigCids = new Set<string>();

        atts.forEach((att) => {
          if (att.contentBytes) {
            const base64 = `data:${att.contentType};base64,${att.contentBytes}`;

            if (att.contentId) {
              const clean = att.contentId
                .replace(/^<|>$/g, "")
                .trim()
                .toLowerCase();
              cidMap.set(clean, base64);
            }

            if (att.name) {
              const cleanName = att.name.trim().toLowerCase();
              cidMap.set(cleanName, base64);
            }
          }
        });

        const images = doc.querySelectorAll("img");
        images.forEach((img) => {
          let src = img.getAttribute("src");
          if (!src) return;

          try {
            src = decodeURIComponent(src);
          } catch (e) {}

          if (src.toLowerCase().startsWith("cid:")) {
            let cid = src.substring(4).trim().toLowerCase();
            let data = cidMap.get(cid);

            if (!data && cid.includes("@")) {
              const shortCid = cid.split("@")[0];
              data = cidMap.get(shortCid);
            }

            if (img.closest("#Signature") || img.closest("[id='Signature']")) {
              if (data) {
              }
              sigCids.add(cid);
              if (cid.includes("@")) sigCids.add(cid.split("@")[0]);
            }

            if (data) {
              img.setAttribute("src", data);
              img.classList.remove("loading-cid");
            } else {
              img.setAttribute(
                "src",
                "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              );
              img.classList.add("loading-cid");
            }
          }
        });

        return { html: doc.body.innerHTML, sigCids: Array.from(sigCids) };
      } catch (e) {
        console.error("Error parsing email body:", e);
        return { html: content, sigCids: [] };
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    const loadDetails = async () => {
      setLoading(true);
      try {
        const details = await fetchEmailDetails(email.id);

        if (mounted && details) {
          const bodyContent = details.body?.content || email.bodyPreview || "";

          setRawBody(bodyContent);

          const hasInline = bodyContent.indexOf("cid:") !== -1;
          const needsAtts = details.hasAttachments || hasInline;
          setNeedsAttachments(needsAtts);

          setProcessedBody(processBody(bodyContent, []).html);
          setDetailsLoaded(true);
        }
      } catch (e) {
        console.error("Error loading email details:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!detailsLoaded) {
      loadDetails();
    }

    return () => {
      mounted = false;
    };
  }, [
    email.id,
    fetchEmailDetails,
    processBody,
    detailsLoaded,
    email.bodyPreview,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadAttachments = async () => {
      if (loadingAttachmentsRef.current) return;
      loadingAttachmentsRef.current = true;

      try {
        const atts = await fetchAttachments(email.id);
        if (mounted) {
          const attsSafe = atts || [];
          setAttachments(attsSafe);

          const { html, sigCids } = processBody(rawBody, attsSafe);
          setProcessedBody(html);

          const sigAttIds = attsSafe
            .filter((a) => {
              const cid = a.contentId
                ? a.contentId.replace(/^<|>$/g, "").trim().toLowerCase()
                : null;
              const name = a.name ? a.name.trim().toLowerCase() : null;
              return (
                (cid && sigCids.includes(cid)) ||
                (name && sigCids.includes(name))
              );
            })
            .map((a) => a.id);

          setSignatureIds(sigAttIds);
          onAttachmentsLoaded(email.id, attsSafe, sigAttIds);
          setAttachmentsLoaded(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        loadingAttachmentsRef.current = false;
      }
    };

    if (isOpen && detailsLoaded && needsAttachments && !attachmentsLoaded) {
      loadAttachments();
    }

    return () => {
      mounted = false;
    };
  }, [
    isOpen,
    detailsLoaded,
    needsAttachments,
    attachmentsLoaded,
    email.id,
    fetchAttachments,
    onAttachmentsLoaded,
    rawBody,
    processBody,
  ]);

  const displayedAttachments = attachments;
  const handleDownloadAll = () => {
    displayedAttachments.forEach((att) => {
      const link = document.createElement("a");
      link.href = `data:${att.contentType};base64,${att.contentBytes}`;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    notifications.show({
      title: "Downloading...",
      message: `${displayedAttachments.length} files`,
      color: "blue",
    });
  };

  return (
    <Paper
      withBorder
      radius="md"
      mb="sm"
      style={{
        overflow: "hidden",
        borderColor: isOpen ? "var(--mantine-color-violet-3)" : undefined,
      }}
    >
      {}
      <Box
        p="sm"
        onClick={onToggle}
        bg={isOpen ? "white" : "gray.0"}
        style={{ cursor: "pointer", transition: "background 0.2s" }}
      >
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Avatar
              size="md"
              radius="xl"
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 45 }}
            >
              {email.from?.emailAddress?.name?.charAt(0) || "?"}
            </Avatar>
            <Stack gap={0}>
              <Text size="sm" fw={700}>
                {email.from?.emailAddress?.name}
              </Text>
              <Text size="xs" c="dimmed">
                {dayjs(email.receivedDateTime).format("MMM D, h:mm A")}
              </Text>
            </Stack>
          </Group>
          <Group>
            {!isOpen && (
              <Text
                size="sm"
                c="dimmed"
                lineClamp={1}
                style={{ maxWidth: 300 }}
              >
                {email.bodyPreview}
              </Text>
            )}
            {}
            {!isOpen && attachments.length > 0 && (
              <FaPaperclip size={12} color="gray" />
            )}
            <ActionIcon variant="transparent" color="gray">
              {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {}
      <Collapse in={isOpen}>
        <Box p="md" pt={0}>
          <Divider mb="md" variant="dashed" />
          <style>{`
            .email-body-content img {
              max-width: 100% !important;
              height: auto !important;
            }
            .loading-cid {
               display: inline-block;
               min-width: 50px;
               min-height: 50px;
               background: #f8f9fa url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" stroke="%23228be6"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg transform="translate(1 1)" stroke-width="2"%3E%3Ccircle stroke-opacity=".5" cx="18" cy="18" r="18"/%3E%3Cpath d="M36 18c0-9.94-8.06-18-18-18"%3E%3CanimateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"/%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E') center no-repeat;
               border-radius: 4px;
               border: 1px solid #dee2e6;
            }
          `}</style>
          {loading && !detailsLoaded ? (
            <Group justify="center" py="xl">
              <Loader size="sm" color="violet" />
            </Group>
          ) : (
            <>
              <Box
                className="email-body-content"
                dangerouslySetInnerHTML={{ __html: processedBody }}
                style={{
                  fontSize: "15px",
                  lineHeight: "1.6",
                  color: "#333",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              />
              {}
              {displayedAttachments.length > 0 && (
                <Paper mt="lg" p="sm" withBorder radius="md" bg="gray.0">
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <ThemeIcon variant="light" color="violet" size="sm">
                        <FaPaperclip size={10} />
                      </ThemeIcon>
                      <Text fw={600} size="xs">
                        Attachments ({displayedAttachments.length})
                      </Text>
                    </Group>
                    <Group gap={8}>
                      <Button
                        leftSection={<FaDownload size={12} />}
                        size="xs"
                        variant="default"
                        onClick={handleDownloadAll}
                      >
                        Download All
                      </Button>
                      <Button
                        leftSection={<FaCloudUploadAlt size={12} />}
                        size="xs"
                        variant="gradient"
                        gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 45 }}
                        onClick={() => onUpload(displayedAttachments)}
                      >
                        Upload to Job
                      </Button>
                    </Group>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
                    {displayedAttachments.map((att) => {
                      const isImage = att.contentType.startsWith("image/");
                      return (
                        <Paper key={att.id} p="xs" withBorder radius="md">
                          <Group wrap="nowrap">
                            {isImage && att.contentBytes ? (
                              <Image
                                src={`data:${att.contentType};base64,${att.contentBytes}`}
                                w={30}
                                h={30}
                                radius="sm"
                                fit="cover"
                              />
                            ) : (
                              <ThemeIcon size="md" variant="light" color="gray">
                                {getFileIcon(att.contentType)}
                              </ThemeIcon>
                            )}
                            <Box style={{ overflow: "hidden" }}>
                              <Text size="xs" truncate>
                                {att.name}
                              </Text>
                              <Text size="10px" c="dimmed">
                                {(att.size / 1024).toFixed(0)} KB
                              </Text>
                            </Box>
                          </Group>
                        </Paper>
                      );
                    })}
                  </SimpleGrid>
                </Paper>
              )}
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

export function InboxDetail({ email, defaultJobId }: InboxDetailProps) {
  const { fetchConversationMessages, fetchEmailDetails } = useOutlook({
    manualFetch: true,
  });

  const [conversation, setConversation] = useState<OutlookEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [attachmentsMap, setAttachmentsMap] = useState<
    Record<string, OutlookAttachment[]>
  >({});

  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    defaultJobId ? String(defaultJobId) : null
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>(
    []
  );
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Installation");

  const {
    options: jobOptions,
    search: jobSearch,
    setSearch: setJobSearch,
    isLoading: jobSearchLoading,
  } = useJobSearch(selectedJobId);

  const { uploadFileAsync, isUploading } = useJobAttachments(
    selectedJobId ? Number(selectedJobId) : 0
  );

  useEffect(() => {
    let mounted = true;
    const loadConversation = async () => {
      setLoading(true);
      setAttachmentsMap({});
      setOpenIds([]);

      try {
        let conversationId = email.conversationId;
        if (!conversationId) {
          const details = await fetchEmailDetails(email.id);
          if (details) conversationId = details.conversationId;
        }

        if (conversationId) {
          const msgs = await fetchConversationMessages(conversationId);
          if (mounted && msgs.length > 0) {
            setConversation(msgs);
            setOpenIds([msgs[msgs.length - 1].id]);
            return;
          }
        }
        if (mounted) {
          setConversation([email]);
          setOpenIds([email.id]);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setConversation([email]);
          setOpenIds([email.id]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConversation();
    return () => {
      mounted = false;
    };
  }, [email.id, email.conversationId]);

  const allAttachments = useMemo(() => {
    return Object.values(attachmentsMap).flat();
  }, [attachmentsMap]);

  const displayedAttachments = useMemo(() => {
    let filtered = allAttachments;

    const seen = new Set();
    return filtered.filter((a) => {
      const key = `${a.name}-${a.size}-${a.contentType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allAttachments]);

  const toggleMessage = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDownloadAll = () => {
    displayedAttachments.forEach((att) => {
      const link = document.createElement("a");
      link.href = `data:${att.contentType};base64,${att.contentBytes}`;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    notifications.show({
      title: "Downloading...",
      message: `${displayedAttachments.length} files`,
      color: "blue",
    });
  };

  const handleUploadClick = () => {
    setSelectedAttachmentIds(displayedAttachments.map((a) => a.id));
    setUploadModalOpen(true);
  };

  const handleMessageUpload = (atts: OutlookAttachment[]) => {
    setSelectedAttachmentIds(atts.map((a) => a.id));
    setUploadModalOpen(true);
  };

  const confirmUpload = async () => {
    if (!selectedJobId) return;
    const filesToUpload = allAttachments.filter((a) =>
      selectedAttachmentIds.includes(a.id)
    );

    try {
      for (const att of filesToUpload) {
        const byteCharacters = atob(att.contentBytes);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], att.name, { type: att.contentType });

        await uploadFileAsync({
          file,
          category: selectedCategory,
          silent: true,
        });
      }
      notifications.show({
        title: "Success",
        message: "uploaded",
        color: "green",
      });
      setUploadModalOpen(false);
    } catch (e: any) {
      notifications.show({ title: "Error", message: e.message, color: "red" });
    }
  };

  if (loading) {
    return (
      <Stack align="center" mt={50}>
        <Loader type="dots" />
      </Stack>
    );
  }

  return (
    <Box h="100%" display="flex" style={{ flexDirection: "column" }}>
      <ScrollArea flex={1} bg="gray.1">
        <Container fluid p={0}>
          <Paper
            p="md"
            shadow="xs"
            radius={0}
            style={{ borderBottom: "1px solid #e0e0e0" }}
          >
            <Group justify="space-between" align="center">
              <Title order={4} style={{ color: "#4A00E0" }}>
                {email.subject || "(No Subject)"}
              </Title>
            </Group>
          </Paper>
          <Stack gap="sm" p="sm">
            {conversation.map((msg, index) => (
              <ThreadMessage
                key={msg.id}
                email={msg}
                isOpen={openIds.includes(msg.id)}
                onToggle={() => toggleMessage(msg.id)}
                onAttachmentsLoaded={(id, atts, sigIds) => {
                  setAttachmentsMap((prev) => ({ ...prev, [id]: atts }));
                }}
                isLatest={index === conversation.length - 1}
                onUpload={handleMessageUpload}
              />
            ))}
          </Stack>
        </Container>
      </ScrollArea>

      {}
      <Modal
        opened={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload to Job"
        centered
        size="lg"
      >
        <Stack>
          <Select
            label="Select Job"
            data={jobOptions}
            searchable
            searchValue={jobSearch}
            onSearchChange={setJobSearch}
            value={selectedJobId}
            onChange={setSelectedJobId}
          />
          <Select
            label="Category"
            data={JobAttachmentCategoryOptions}
            value={selectedCategory}
            onChange={(v) => setSelectedCategory(v || "Installation")}
          />

          <Text size="sm" fw={500} mt="sm">
            Selected Files:
          </Text>
          <ScrollArea.Autosize mah={300} type="always">
            <SimpleGrid cols={2} spacing="xs">
              {displayedAttachments.map((att) => {
                const isImage = att.contentType.startsWith("image/");
                const isSelected = selectedAttachmentIds.includes(att.id);
                return (
                  <Paper
                    key={att.id + "modal"}
                    p="xs"
                    withBorder
                    radius="md"
                    bg={
                      isSelected ? "var(--mantine-color-violet-0)" : undefined
                    }
                    style={{
                      cursor: "pointer",
                      borderColor: isSelected
                        ? "var(--mantine-color-violet-5)"
                        : undefined,
                    }}
                    onClick={() => {
                      if (isSelected)
                        setSelectedAttachmentIds((p) =>
                          p.filter((x) => x !== att.id)
                        );
                      else setSelectedAttachmentIds((p) => [...p, att.id]);
                    }}
                  >
                    <Group wrap="nowrap">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ pointerEvents: "none" }}
                      />
                      {isImage && att.contentBytes ? (
                        <Image
                          src={`data:${att.contentType};base64,${att.contentBytes}`}
                          w={40}
                          h={40}
                          radius="sm"
                          fit="cover"
                        />
                      ) : (
                        <ThemeIcon size="lg" variant="light" color="gray">
                          {getFileIcon(att.contentType)}
                        </ThemeIcon>
                      )}
                      <Box style={{ overflow: "hidden" }}>
                        <Text size="xs" truncate>
                          {att.name}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {(att.size / 1024).toFixed(0)} KB
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </ScrollArea.Autosize>

          <Button
            fullWidth
            onClick={confirmUpload}
            loading={isUploading}
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 45 }}
            mt="md"
          >
            Upload {selectedAttachmentIds.length} Files
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
