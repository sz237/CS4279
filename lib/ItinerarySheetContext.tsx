import { createContext, useContext } from "react";
import type { StopModel } from "@/src/models";

interface ItinerarySheetContextValue {
  /** Called by the sticky header when its layout height is measured */
  reportStickyHeaderHeight: (height: number) => void;
  /** Called by the active tab to tell the map which day to show (null = all days) */
  setMapDay: (day: string | null) => void;
  /** Opens the edit trip modal (rendered at the layout level to avoid overflow:hidden clipping) */
  openEditModal: () => void;
  /**
   * Push a temporary ordered stop list to the map during edit mode so reorder
   * changes are reflected immediately without a Firestore write.
   * Pass null to clear and revert to Firestore-backed stops.
   */
  setPreviewStops: (stops: StopModel[] | null) => void;
}

export const ItinerarySheetContext = createContext<ItinerarySheetContextValue>({
  reportStickyHeaderHeight: () => {},
  setMapDay: () => {},
  openEditModal: () => {},
  setPreviewStops: () => {},
});

export const useItinerarySheet = () => useContext(ItinerarySheetContext);
