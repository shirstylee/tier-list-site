import { UserCircle } from "@phosphor-icons/react";
import Brand from "./Brand";
import CategorySwitch from "./CategorySwitch";

export default function TopBar({
  categories,
  activeCategory,
  profile,
  onCategoryChange,
  onAddCategory,
  onDeleteCategory,
  onProfile,
  onHome,
}) {
  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden md:block">
          <Brand compact onClick={onHome} />
        </div>
      </div>

      <CategorySwitch
        categories={categories}
        activeId={activeCategory.id}
        onChange={onCategoryChange}
        onAdd={onAddCategory}
        onDelete={onDeleteCategory}
      />

      <button
        type="button"
        onClick={onProfile}
        className="profile-trigger"
        aria-label="Открыть профиль"
      >
        <span className="hidden text-right sm:block">
          <span className="block max-w-40 truncate text-[14px] font-extrabold tracking-[0.01em] text-white">
            {profile.nickname}
          </span>
        </span>
        <span className="profile-orbit">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" />
          ) : (
            <UserCircle size={25} weight="fill" />
          )}
        </span>
      </button>
    </header>
  );
}
