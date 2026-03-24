import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/src/config/firebase";
import type { StopModel } from "@/src/models";

/**
 * Subscribes to the stops subcollection of a given itinerary in real-time.
 * Any collaborator's edits will automatically update `stops` in the calling
 * component without a manual refetch.
 *
 * Pass `null` as itineraryId to skip subscribing (useful when the ID isn't
 * known yet).
 */
export function useStops(itineraryId: string | null) {
  const [stops, setStops] = useState<StopModel[]>([]);
  const [loading, setLoading] = useState(itineraryId !== null);

  useEffect(() => {
    if (!itineraryId) {
      setStops([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "itineraries", itineraryId, "stops"),
      orderBy("orderIndex", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setStops(snap.docs.map((d) => d.data() as StopModel));
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [itineraryId]);

  return { stops, loading };
}
