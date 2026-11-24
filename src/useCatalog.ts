import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { catalog, parseCatalog, type CatalogProduct } from "./catalog";

const cacheKey = "mercaditox.catalog.v3";
const cacheDuration = 24 * 60 * 60 * 1000;
const retryDelay = 5 * 60 * 1000;

export function useCatalog(open: boolean, readRemote?: () => Promise<CatalogProduct[]>) {
  const [products, setProducts] = useState(catalog);
  const lastAttempt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open || !readRemote) return;
    async function refresh(fetchProducts: () => Promise<CatalogProduct[]>) {
      let cachedAt = 0;
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const cache = JSON.parse(raw);
          const cached = parseCatalog(cache?.products);
          if (cached) {
            setProducts(cached);
            if (typeof cache.fetchedAt === "number") cachedAt = cache.fetchedAt;
          }
        }
      } catch {
        // Keep the catalog bundled with the app when the device cache is unavailable.
      }

      const now = Date.now();
      if (cachedAt && now >= cachedAt && now - cachedAt < cacheDuration) return;
      if (lastAttempt.current !== undefined && now - lastAttempt.current < retryDelay && now >= lastAttempt.current) return;
      lastAttempt.current = now;
      try {
        const fresh = await fetchProducts();
        setProducts(fresh);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), products: fresh }));
      } catch {
        // A failed refresh leaves the last available catalog in place.
      }
    }
    void refresh(readRemote);
  }, [open, readRemote]);

  return products;
}
