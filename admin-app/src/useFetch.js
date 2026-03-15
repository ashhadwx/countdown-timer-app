import { useState, useEffect, useCallback } from "react";

/**
 * Simple fetch hook. GET by default; pass { immediate: false } to trigger manually via fetch().
 */
export function useFetch(url, options = {}) {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const doFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Request failed");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    if (immediate && url) doFetch();
  }, [immediate, url, doFetch]);

  return { data, loading, error, refetch: doFetch, fetch: doFetch };
}
