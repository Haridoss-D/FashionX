import { useEffect, useState } from "react";
import { api } from "../api.js";

let cached = null; // fetched once, then shared by every page

export function useDelivery() {
  const [dates, setDates] = useState(cached);
  useEffect(() => {
    if (cached) return;
    api("/delivery/")
      .then((d) => {
        cached = d;
        setDates(d);
      })
      .catch(() => {});
  }, []);
  return dates; // { min: "2026-11-26", max: "2026-11-30" } or null while loading
}
