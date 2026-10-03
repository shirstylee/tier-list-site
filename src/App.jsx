import { useEffect, useState } from "react";
import CategoryModal from "./components/CategoryModal";
import ProfilePanel from "./components/ProfilePanel";
import SavedLists from "./components/SavedLists";
import TierEditor from "./components/TierEditor";
import TopBar from "./components/TopBar";
import UnavailableView from "./components/UnavailableView";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PROFILE,
  TIER_COLORS,
} from "./data";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { isValidBackup } from "./lib/dataValidation";

const LEGACY_TIER_COLORS = new Set([
  "#2f6edb",
  "#285fbf",
  "#214f9f",
  "#193d7b",
  "#122a55",
]);

function applyTierPalette(lists) {
  let changed = false;
  const nextLists = lists.map((list) => ({
    ...list,
    tiers: list.tiers.map((tier, index) => {
      const normalizedColor = tier.color.toLowerCase();
      const usesLegacyColor =
        LEGACY_TIER_COLORS.has(normalizedColor) ||
        normalizedColor.startsWith("rgba(47, 110, 219");

      if (!usesLegacyColor) return tier;

      changed = true;
      return {
        ...tier,
        color: TIER_COLORS[index % TIER_COLORS.length],
      };
    }),
  }));

  return changed ? nextLists : lists;
}

export default function App() {
  const [categories, setCategories, categoriesError] = useLocalStorage(
    "rankd-categories",
    DEFAULT_CATEGORIES,
  );
  const [lists, setLists, listsError] = useLocalStorage("rankd-lists", []);
  const [profile, setProfile, profileError] = useLocalStorage(
    "rankd-profile",
    DEFAULT_PROFILE,
  );
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [view, setView] = useState("home");
  const [editingList, setEditingList] = useState(null);
  const [editorKey, setEditorKey] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const storageError = listsError || profileError || categoriesError;

  useEffect(() => {
    setLists((current) => applyTierPalette(current));
  }, [setLists]);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const openEditor = (list = null) => {
    setActiveCategory(categories.find((category) => category.id === "games"));
    setEditingList(list);
    setEditorKey(list?.id ?? crypto.randomUUID());
    setView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setView("home");
    setEditingList(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategory = (category) => {
    setActiveCategory(category);
    if (category.enabled) {
      goHome();
    } else {
      setView("unavailable");
    }
  };

  const createCategory = (label) => {
    const category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      enabled: false,
    };
    setCategories((current) => [...current, category]);
    setActiveCategory(category);
    setCategoryModalOpen(false);
    setView("unavailable");
  };

  const deleteCategory = (categoryId) => {
    if (categoryId === "games") return;
    setCategories((current) =>
      current.filter((category) => category.id !== categoryId),
    );

    if (activeCategory.id === categoryId) {
      const gamesCategory =
        categories.find((category) => category.id === "games") ??
        DEFAULT_CATEGORIES[0];
      setActiveCategory(gamesCategory);
      goHome();
    }
  };

  const saveList = (list) => {
    setLists((current) => {
      const exists = current.some((item) => item.id === list.id);
      return exists
        ? current.map((item) => (item.id === list.id ? list : item))
        : [list, ...current];
    });
    setEditingList(list);
  };

  const duplicateList = (listId) => {
    const source = lists.find((list) => list.id === listId);
    if (!source) return;
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} — копия`,
      updatedAt: new Date().toISOString(),
      tiers: source.tiers.map((tier) => ({ ...tier, games: [...tier.games] })),
      unranked: [...source.unranked],
      activity: [],
    };
    setLists((current) => [copy, ...current]);
  };

  const deleteList = (listId) => {
    setLists((current) => current.filter((list) => list.id !== listId));
  };

  const exportData = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      categories,
      lists,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tierlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (payload) => {
    if (!isValidBackup(payload)) {
      return {
        ok: false,
        message: "Файл не похож на резервную копию Tier List.",
      };
    }

    const importedCategories = payload.categories.some(
      (category) => category.id === "games",
    )
      ? payload.categories
      : [DEFAULT_CATEGORIES[0], ...payload.categories];

    setProfile({
      nickname: payload.profile.nickname.slice(0, 32),
      avatar: payload.profile.avatar,
    });
    setCategories(importedCategories);
    setLists(applyTierPalette(payload.lists));
    setActiveCategory(
      importedCategories.find((category) => category.id === "games"),
    );
    setEditingList(null);
    setView("home");

    return {
      ok: true,
      message: `Импортировано списков: ${payload.lists.length}.`,
    };
  };

  return (
    <div className="app-shell">
      <TopBar
        categories={categories}
        activeCategory={activeCategory}
        profile={profile}
        onCategoryChange={handleCategory}
        onAddCategory={() => setCategoryModalOpen(true)}
        onDeleteCategory={deleteCategory}
        onProfile={() => setProfileOpen(true)}
        onHome={goHome}
      />

      {storageError && <p className="storage-warning" role="alert">{storageError}</p>}

      {view === "home" && (
        <>
          <SavedLists
            lists={lists}
            onOpen={openEditor}
            onCreate={() => openEditor()}
            onDelete={deleteList}
            onDuplicate={duplicateList}
          />
        </>
      )}

      {view === "editor" && (
        <TierEditor
          key={editorKey}
          initialList={editingList}
          onSave={saveList}
          storageError={listsError}
        />
      )}

      {view === "unavailable" && (
        <UnavailableView
          category={activeCategory}
          onBack={() => handleCategory(categories[0])}
        />
      )}

      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        lists={lists}
        profile={profile}
        onProfileChange={setProfile}
        onExport={exportData}
        onImport={importData}
        onInstall={installPrompt ? installApp : null}
      />
      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreate={createCategory}
      />
      <footer className="footer">
        <span>TIER LIST / {new Date().getFullYear()}</span>
        <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">Данные об играх и изображения — RAWG</a>
        <span>Тир-листы хранятся в этом браузере.</span>
      </footer>
    </div>
  );
}
