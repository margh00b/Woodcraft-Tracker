"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  PublicClientApplication,
  EventType,
  AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

const msalConfig = {
  auth: {
    clientId: "3ea61d91-6068-4812-aadf-d4735e9992e0",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

export default function OutlookAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isMsalInitialized, setIsMsalInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();

        await msalInstance.handleRedirectPromise().then((response) => {
          if (response) {
            console.log("Login Success via Redirect:", response);
            msalInstance.setActiveAccount(response.account);
          }
        });

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
          msalInstance.setActiveAccount(accounts[0]);
        }

        msalInstance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const payload = event.payload as AuthenticationResult;
            msalInstance.setActiveAccount(payload.account);
          }
        });

        setIsMsalInitialized(true);
      } catch (error) {
        console.error("MSAL Initialization Failed:", error);
      }
    };

    initializeMsal();
  }, []);

  if (!isMsalInitialized) return null;

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
