import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { starter, type Market } from "./shopping";

const storageKey = "mercaditox.market.v1";

export function useMarket() {
  const [market, setMarket] = useState<Market | null>(null);
  const [problem, setProblem] = useState("");
  const current = useRef<Market | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (!active) return;
      const saved: Market = stored ? JSON.parse(stored) : starter;
      if (!Array.isArray(saved.lists) || !saved.lists.some((list) => list.id === saved.activeId)) {
        throw new Error("Invalid market");
      }
      current.current = saved;
      setMarket(saved);
    }).catch(() => {
      if (active) setProblem("No pudimos abrir las listas guardadas.");
    });
    return () => { active = false; };
  }, []);

  const change = useCallback((update: (market: Market) => Market) => {
    if (!current.current) return;
    const next = update(current.current);
    if (next === current.current) return;
    current.current = next;
    setMarket(next);
    queue.current = queue.current.then(async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
        setProblem("");
      } catch {
        setProblem("No se pudo guardar el último cambio en este celular.");
      }
    });
  }, []);

  return { market, problem, change };
}
