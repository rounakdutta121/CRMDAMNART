"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type GlobalLoadingContextValue = {
  begin: () => void;
  end: () => void;
  isLoading: boolean;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(
  null
);

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const begin = useCallback(() => {
    setCount((value) => value + 1);
  }, []);

  const end = useCallback(() => {
    setCount((value) => Math.max(0, value - 1));
  }, []);

  const value = useMemo(
    () => ({
      begin,
      end,
      isLoading: count > 0,
    }),
    [begin, end, count]
  );

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      <GlobalLoadingOverlay active={count > 0} />
    </GlobalLoadingContext.Provider>
  );
}

function useGlobalLoadingApi() {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return context;
}

/** Keeps the global loader in sync with a local pending flag. */
export function useGlobalLoading(pending: boolean) {
  const { begin, end } = useGlobalLoadingApi();

  useEffect(() => {
    if (!pending) {
      return;
    }
    begin();
    return () => {
      end();
    };
  }, [pending, begin, end]);
}

export function GlobalLoadingSync({ pending }: { pending: boolean }) {
  useGlobalLoading(pending);
  return null;
}

function GlobalLoadingOverlay({ active }: { active: boolean }) {
  return (
    <div
      className={`global-loading ${active ? "global-loading--active" : ""}`}
      aria-busy={active}
      aria-live="polite"
      aria-hidden={!active}
    >
      <div className="global-loading__bar" />
      <div className="global-loading__panel">
        <span className="global-loading__spinner" />
        <span className="global-loading__label">Processing…</span>
      </div>
    </div>
  );
}

/** Shows loader briefly while client navigations settle. */
export function NavigationLoadingSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { begin, end } = useGlobalLoadingApi();
  const isFirstRoute = useRef(true);

  useEffect(() => {
    if (isFirstRoute.current) {
      isFirstRoute.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      end();
    }, 280);
    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, searchParams, end]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
          return;
        }
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      begin();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin]);

  return null;
}
