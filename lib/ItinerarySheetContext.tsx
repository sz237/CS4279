import { createContext, useContext } from "react";

interface ItinerarySheetContextValue {
  /** Called by the sticky header when its layout height is measured */
  reportStickyHeaderHeight: (height: number) => void;
}

export const ItinerarySheetContext = createContext<ItinerarySheetContextValue>({
  reportStickyHeaderHeight: () => {},
});

export const useItinerarySheet = () => useContext(ItinerarySheetContext);
