import { Plus, X } from "@phosphor-icons/react";

export default function CategorySwitch({
  categories,
  activeId,
  onChange,
  onAdd,
  onDelete,
}) {
  return (
    <div className="category-shell scrollbar-none" aria-label="Категории">
      <div className="category-track">
        {categories.map((category) => {
          const canDelete = category.id !== "games";
          return (
            <div
              key={category.id}
              className={`category-option ${
                canDelete ? "category-option-deletable" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(category)}
                className={`category-tab ${
                  activeId === category.id ? "category-tab-active" : ""
                }`}
                aria-pressed={activeId === category.id}
              >
                <span>{category.label}</span>
                {!category.enabled && (
                  <span className="ml-2 hidden font-mono text-[10px] uppercase opacity-45 sm:inline">
                    скоро
                  </span>
                )}
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="category-delete"
                  onClick={() => onDelete(category.id)}
                  aria-label={`Удалить категорию ${category.label}`}
                  title="Удалить категорию"
                >
                  <X size={11} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="category-add"
          aria-label="Добавить категорию"
          onClick={onAdd}
        >
          <Plus size={17} weight="bold" />
        </button>
      </div>
    </div>
  );
}
