"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import {
  GlobalLoadingProvider,
  NavigationLoadingSync,
} from "@/components/shared/global-loading";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalLoadingProvider>
        <Suspense fallback={null}>
          <NavigationLoadingSync />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" />
      </GlobalLoadingProvider>
    </SessionProvider>
  );
}
