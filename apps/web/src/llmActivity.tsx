import React, { createContext, useContext, useMemo, useState } from "react";

type LlmActivityApi = {
  inFlightCount: number;
  isBusy: boolean;
  begin(): () => void;
  run<T>(fn: () => Promise<T>): Promise<T>;
};

const LlmActivityContext = createContext<LlmActivityApi | null>(null);

export function LlmActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [inFlightCount, setInFlightCount] = useState(0);
  const [holdBusyUntilMs, setHoldBusyUntilMs] = useState(0);

  const api = useMemo<LlmActivityApi>(() => {
    return {
      inFlightCount,
      isBusy: inFlightCount > 0 || holdBusyUntilMs > 0,
      begin() {
        // Clear any pending "busy hold" when a new request starts.
        if (holdBusyUntilMs !== 0) setHoldBusyUntilMs(0);
        setInFlightCount((c) => c + 1);
        return () =>
          setInFlightCount((c) => {
            const next = Math.max(0, c - 1);
            if (next === 0) {
              // Avoid flicker between sequential requests (auto-translation batches).
              setHoldBusyUntilMs(400);
              window.setTimeout(() => setHoldBusyUntilMs(0), 400);
            }
            return next;
          });
      },
      async run<T>(fn: () => Promise<T>) {
        const end = this.begin();
        try {
          return await fn();
        } finally {
          end();
        }
      },
    };
  }, [inFlightCount]);

  return (
    <LlmActivityContext.Provider value={api}>
      {children}
    </LlmActivityContext.Provider>
  );
}

export function useLlmActivity() {
  const ctx = useContext(LlmActivityContext);
  if (!ctx) {
    throw new Error("useLlmActivity must be used within LlmActivityProvider");
  }
  return ctx;
}
