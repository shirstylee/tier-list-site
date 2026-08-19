import { useCallback, useState } from "react";

export function useHistoryState(initialValue, limit = 80) {
  const [history, setHistory] = useState(() => ({
    past: [],
    present:
      typeof initialValue === "function" ? initialValue() : initialValue,
    future: [],
  }));

  const setValue = useCallback(
    (update, options = {}) => {
      setHistory((current) => {
        const next =
          typeof update === "function" ? update(current.present) : update;
        if (Object.is(next, current.present)) return current;

        if (options.record === false) {
          return { ...current, present: next };
        }

        return {
          past: [...current.past, current.present].slice(-limit),
          present: next,
          future: [],
        };
      });
    },
    [limit],
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past.at(-1);
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present].slice(-limit),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, [limit]);

  return {
    value: history.present,
    setValue,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
