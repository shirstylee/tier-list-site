import { useCallback, useRef, useState } from "react";
import { validateStoredValue } from "../lib/dataValidation";

export function useLocalStorage(key, initialValue) {
  const [initial] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : initialValue;
      if (!validateStoredValue(key, parsed)) throw new Error("Invalid saved data");
      return { value: parsed, error: "" };
    } catch {
      return { value: initialValue, error: "Не удалось прочитать локальные данные. Сохранённая копия не перезаписана. Попробуйте импорт резервной копии." };
    }
  });
  const [value, setState] = useState(initial.value);
  const [error, setError] = useState(initial.error);
  const currentValue = useRef(initial.value);

  const setValue = useCallback((update) => {
    const next = typeof update === "function" ? update(currentValue.current) : update;
    if (Object.is(next, currentValue.current)) return;
    currentValue.current = next;
    setState(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError("Не удалось сохранить изменения на устройстве. Освободите место в браузере и экспортируйте данные из профиля.");
    }
  }, [key]);

  return [value, setValue, error];
}
