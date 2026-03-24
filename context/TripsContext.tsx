import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/src/config/firebase";
import type { ItineraryModel } from "@/src/models";

type TripsContextValue = {
  trips: ItineraryModel[];
  loading: boolean;
  selectedTripId: string | null;
  selectTrip: (id: string) => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<ItineraryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const unsubTripsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Tear down the previous itinerary listener whenever auth changes
      unsubTripsRef.current?.();
      unsubTripsRef.current = null;

      if (!user) {
        setTrips([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const q = query(
        collection(db, "itineraries"),
        where("memberUids", "array-contains", user.uid),
        orderBy("startDate", "asc")
      );

      unsubTripsRef.current = onSnapshot(
        q,
        (snap) => {
          setTrips(snap.docs.map((d) => d.data() as ItineraryModel));
          setLoading(false);
        },
        () => {
          // On error, stop the spinner so the UI doesn't hang
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubTripsRef.current?.();
    };
  }, []);

  return (
    <TripsContext.Provider value={{ trips, loading, selectedTripId, selectTrip: setSelectedTripId }}>
      {children}
    </TripsContext.Provider>
  );
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error("useTrips must be used within TripsProvider");
  return ctx;
}
