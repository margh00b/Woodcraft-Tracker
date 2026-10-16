import { useState, useEffect, useCallback, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { Client } from "@microsoft/microsoft-graph-client";
import { notifications } from "@mantine/notifications";

export interface OutlookEmail {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  hasAttachments: boolean;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  conversationId: string;
  conversationIndex: string;
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentBytes: string;
  contentId?: string;
}

const detailsCache = new Map<string, Promise<any>>();
const conversationCache = new Map<string, Promise<any>>();

export function useOutlook(options?: { manualFetch?: boolean }) {
  const { instance, accounts } = useMsal();

  const [emails, setEmails] = useState<OutlookEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const [nextPageLinks, setNextPageLinks] = useState<(string | null)[]>([]);
  const nextPageLinksRef = useRef(nextPageLinks);

  useEffect(() => {
    nextPageLinksRef.current = nextPageLinks;
  }, [nextPageLinks]);

  const activeAccount = instance.getActiveAccount();
  const account = activeAccount || accounts[0];

  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const accountIdentifier = account?.homeAccountId || account?.username || "";

  const getGraphClient = useCallback(async () => {
    const currentAccount = accountRef.current;
    if (!currentAccount) {
      throw new Error("No active account");
    }

    const request = {
      scopes: ["Mail.Read"],
      account: currentAccount,
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      return Client.init({
        authProvider: (done) => done(null, response.accessToken),
      });
    } catch (e) {
      console.error("Token acquisition failed", e);
      throw e;
    }
  }, [instance, accountIdentifier]);

  const loadPage = useCallback(
    async (pageIndex: number) => {
      if (!accountRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const client = await getGraphClient();
        let result;

        if (searchQuery) {
          if (pageIndex === 0) {
            result = await client
              .api("/me/mailFolders/inbox/messages")
              .search(`"${searchQuery}"`)
              .select(
                "id,conversationId,conversationIndex,subject,from,receivedDateTime,hasAttachments,bodyPreview,toRecipients"
              )
              .top(pageSize)
              .get();
          } else {
            const cursorLink = nextPageLinksRef.current[pageIndex - 1];

            if (!cursorLink) {
              console.warn("No nextLink available for page", pageIndex);
              setLoading(false);
              return;
            }

            result = await client.api(cursorLink).get();
          }
        } else {
          result = await client
            .api("/me/mailFolders/inbox/messages")
            .select(
              "id,conversationId,conversationIndex,subject,from,receivedDateTime,hasAttachments,bodyPreview,toRecipients"
            )
            .top(pageSize)
            .skip(pageIndex * pageSize)
            .orderby("receivedDateTime DESC")
            .get();
        }

        setEmails(result.value);
        setPage(pageIndex);

        const nextLink = result["@odata.nextLink"];
        if (nextLink) {
          setHasMore(true);
          setNextPageLinks((prev) => {
            const copy = [...prev];
            copy[pageIndex] = nextLink;
            return copy;
          });
        } else {
          setHasMore(false);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch emails");
        notifications.show({
          title: "Error",
          message: "Failed to fetch emails from Outlook",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    },
    [accountIdentifier, getGraphClient, searchQuery, pageSize]
  );

  useEffect(() => {
    if (!options?.manualFetch && accountIdentifier) {
      setNextPageLinks([]);
      loadPage(0);
    }
  }, [searchQuery, accountIdentifier, options?.manualFetch, loadPage]);

  const fetchAttachments = useCallback(
    async (messageId: string): Promise<OutlookAttachment[]> => {
      try {
        const client = await getGraphClient();
        const result = await client
          .api(`/me/messages/${messageId}/attachments`)
          .get();
        return result.value;
      } catch (e) {
        console.error(e);
        return [];
      }
    },
    [getGraphClient]
  );

  const fetchEmailDetails = useCallback(
    async (
      messageId: string
    ): Promise<
      (OutlookEmail & { attachments?: OutlookAttachment[] }) | null
    > => {
      if (detailsCache.has(messageId)) {
        return detailsCache.get(messageId);
      }

      const requestPromise = (async () => {
        try {
          const client = await getGraphClient();
          const result = await client.api(`/me/messages/${messageId}`).get();

          return result;
        } catch (e) {
          console.error(e);
          detailsCache.delete(messageId);
          return null;
        }
      })();

      detailsCache.set(messageId, requestPromise);
      return requestPromise;
    },
    [getGraphClient]
  );

  const fetchConversationMessages = useCallback(
    async (
      conversationId: string
    ): Promise<(OutlookEmail & { attachments?: OutlookAttachment[] })[]> => {
      if (conversationCache.has(conversationId)) {
        return conversationCache.get(conversationId);
      }

      const requestPromise = (async () => {
        try {
          const client = await getGraphClient();
          const result = await client
            .api("/me/messages")
            .filter(`conversationId eq '${conversationId}'`)
            .get();

          return (result.value || []).sort(
            (a: OutlookEmail, b: OutlookEmail) =>
              new Date(a.receivedDateTime).getTime() -
              new Date(b.receivedDateTime).getTime()
          );
        } catch (e) {
          console.error("Failed to fetch conversation thread", e);
          conversationCache.delete(conversationId);
          return [];
        }
      })();

      conversationCache.set(conversationId, requestPromise);
      return requestPromise;
    },
    [getGraphClient]
  );

  return {
    emails,
    loading,
    error,
    page,
    hasMore,
    searchQuery,
    setSearchQuery,
    loadPage,
    fetchEmailDetails,
    fetchConversationMessages,
    fetchAttachments,
  };
}
