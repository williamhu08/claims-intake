"use client";

/** Clearway version scope: V0. */

import { createContext, useContext, useSyncExternalStore } from "react";

export const TestingModeContext = createContext(false);
export const useTestingMode = () => useContext(TestingModeContext);

// Persisting the toggle (rather than plain useState) means it survives a full
// navigation — e.g. leaving to a developer page like /testing/answer-types and
// clicking back — so the claim intake page renders in the exact same format
// the user left it in, instead of silently resetting to non-testing mode.
//
// This is modeled as a tiny external store (read/write localStorage,
// subscribe/notify a listener set) and consumed via useSyncExternalStore
// rather than useState+useEffect, which is the React-recommended way to sync
// with a browser API like localStorage: it can report a safe server snapshot
// (false) during SSR/hydration and then reconcile with the real persisted
// value on the client without a hydration mismatch or a setState-in-effect.
const TESTING_MODE_STORAGE_KEY = "clearway:testing-mode";
const testingModeListeners = new Set<() => void>();

function getTestingModeSnapshot() {
  return window.localStorage.getItem(TESTING_MODE_STORAGE_KEY) === "1";
}

function getTestingModeServerSnapshot() {
  return false;
}

function subscribeToTestingMode(listener: () => void) {
  testingModeListeners.add(listener);
  return () => testingModeListeners.delete(listener);
}

function setTestingModeStored(next: boolean) {
  window.localStorage.setItem(TESTING_MODE_STORAGE_KEY, next ? "1" : "0");
  testingModeListeners.forEach((listener) => listener());
}

export function AppShell({ isProduction, children }: { isProduction: boolean; children: React.ReactNode }) {
  const testingMode = useSyncExternalStore(subscribeToTestingMode, getTestingModeSnapshot, getTestingModeServerSnapshot);

  function toggleTestingMode() {
    setTestingModeStored(!testingMode);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary font-serif text-sm font-semibold text-primary-foreground" aria-hidden="true">CW</span>
            <span className="text-sm font-semibold tracking-tight text-foreground">Clearway</span>
          </div>
          {isProduction ? null : (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
              <span title="Uses deterministic mock responses and does not call the AI model">Testing mode <span className="font-normal text-muted-foreground/80">(no AI calls)</span></span>
              <button
                type="button"
                role="switch"
                aria-checked={testingMode}
                aria-label="Testing mode"
                onClick={toggleTestingMode}
                className="relative h-5 w-9 rounded-full bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[checked=true]:bg-primary"
                data-checked={testingMode}
              >
                <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform data-[checked=true]:translate-x-4" data-checked={testingMode} />
              </button>
            </label>
          )}
        </div>
      </header>
      <TestingModeContext.Provider value={testingMode}>{children}</TestingModeContext.Provider>
    </>
  );
}
