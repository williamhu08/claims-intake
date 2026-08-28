"use client";

import { createContext, useContext, useState } from "react";

export const TestingModeContext = createContext(false);
export const useTestingMode = () => useContext(TestingModeContext);

export function AppShell({ isProduction, children }: { isProduction: boolean; children: React.ReactNode }) {
  const [testingMode, setTestingMode] = useState(false);

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
                onClick={() => setTestingMode((enabled) => !enabled)}
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
