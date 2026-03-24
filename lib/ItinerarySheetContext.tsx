import { createContext, useContext } from "react";

interface ItinerarySheetContextValue {
  /** Called by the sticky header when its layout height is measured */
  reportStickyHeaderHeight: (height: number) => void;
  /** Called by the active tab to tell the map which day to show (null = all days) */
  setMapDay: (day: string | null) => void;
  /** Opens the edit trip modal (rendered at the layout level to avoid overflow:hidden clipping) */
  openEditModal: () => void;
}

export const ItinerarySheetContext = createContext<ItinerarySheetContextValue>({
  reportStickyHeaderHeight: () => {},
  setMapDay: () => {},
  openEditModal: () => {},
});

export const useItinerarySheet = () => useContext(ItinerarySheetContext);
