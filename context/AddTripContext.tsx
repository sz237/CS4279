import { createContext, useContext, type ReactNode } from "react";
import { useAddTrip } from "@/hooks/useAddTrip";

type AddTripContextValue = ReturnType<typeof useAddTrip>;

const AddTripContext = createContext<AddTripContextValue | null>(null);

export function AddTripProvider({ children }: { children: ReactNode }) {
  const value = useAddTrip();
  return (
    <AddTripContext.Provider value={value}>{children}</AddTripContext.Provider>
  );
}

export function useAddTripContext(): AddTripContextValue {
  const ctx = useContext(AddTripContext);
  if (!ctx) throw new Error("useAddTripContext must be used within AddTripProvider");
  return ctx;
}
