import "../../global.css";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { Slot } from "expo-router";
import { tokenCache } from "../utils/tokenCache";
import { JobProvider } from "../context/JobContext";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <JobProvider>
          <Slot />
        </JobProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
