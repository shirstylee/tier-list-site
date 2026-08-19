import { useState } from "react";
import Modal from "./Modal";

export default function CategoryModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Минимум два символа.");
      return;
    }
    onCreate(cleanName);
    setName("");
    setError("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая категория">
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2">
          <span className="field-label">Название</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            className="field-input"
            placeholder="Например, Книги"
          />
          <span className={error ? "field-error" : "field-help"}>
            {error || "Категория появится в верхнем переключателе."}
          </span>
        </label>
        <button type="submit" className="primary-button justify-center">
          Добавить категорию
        </button>
      </form>
    </Modal>
  );
}
