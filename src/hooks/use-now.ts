import { useEffect, useState } from "react";

export function useNow(tickMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);
  return now;
}
