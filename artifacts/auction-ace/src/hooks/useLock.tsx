import { createContext, useContext, ReactNode } from "react";

interface LockCtx {
  locked: boolean;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<LockCtx>({
  locked: false,
  isAdmin: true,
  loading: false,
  refresh: async () => {},
});

export function LockProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider
      value={{
        locked: false,
        isAdmin: true,
        loading: false,
        refresh: async () => {},
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useLock = () => useContext(Ctx);
