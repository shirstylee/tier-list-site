import {
  ArrowUpRight,
  Clock,
  Copy,
  DotsThree,
  MagnifyingGlass,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import GameArt from "./GameArt";

function MiniTier({ tier }) {
  const visibleGames = tier.games.slice(0, 8);
  const hiddenGames = Math.max(0, tier.games.length - visibleGames.length);
  return (
    <div className="mini-tier">
      <span className="mini-tier-label" style={{ backgroundColor: tier.color }}>{tier.label}</span>
      <div className="mini-tier-games">
        {visibleGames.map((game) => <GameArt key={game.id} game={game} className="mini-tier-game" />)}
        {hiddenGames > 0 && <span className="mini-tier-more">+{hiddenGames}</span>}
        {tier.games.length === 0 && <span className="mini-tier-empty" />}
      </div>
    </div>
  );
}

function countGames(list) {
  return list.unranked.length + list.tiers.reduce((sum, tier) => sum + tier.games.length, 0);
}

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Недавно";
  return new Intl.DateTimeFormat("ru", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function ListPreview({ list }) {
  return (
    <span className="saved-preview">
      {list.tiers.slice(0, 5).map((tier) => <MiniTier key={tier.id} tier={tier} />)}
    </span>
  );
}

export default function SavedLists({ lists, onOpen, onCreate, onDelete, onDuplicate }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [openMenuId, setOpenMenuId] = useState(null);

  const sortedLists = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return lists
      .filter((list) => list.title.toLocaleLowerCase("ru").includes(normalized))
      .sort((first, second) => {
        if (sortBy === "title") return first.title.localeCompare(second.title, "ru");
        if (sortBy === "games") return countGames(second) - countGames(first);
        return new Date(second.updatedAt) - new Date(first.updatedAt);
      });
  }, [lists, query, sortBy]);

  const latestList = [...lists].sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))[0];

  return (
    <section className="saved-section">
      <div className="saved-heading">
        <div>
          <p className="eyebrow mb-3"><Clock size={14} weight="bold" />Библиотека вкуса</p>
          <h2 className="section-title">Твои тир-листы</h2>
        </div>
        <div className="saved-heading-actions">
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/38">
            {lists.length.toString().padStart(2, "0")} сохранено
          </span>
          <button type="button" className="saved-create" onClick={onCreate}><Plus size={16} weight="bold" />Создать тир-лист</button>
        </div>
      </div>

      {lists.length === 0 ? (
        <button type="button" className="empty-list" onClick={onCreate}>
          <span className="empty-cross" aria-hidden="true"><Plus size={30} weight="thin" /></span>
          <span><strong>Здесь пока тихо</strong><small>Создай первый список — он сохранится в этом браузере.</small></span>
          <ArrowUpRight size={23} weight="bold" />
        </button>
      ) : (
        <>
          {latestList && (
            <div className="recent-list-section">
              <div className="library-subheading"><span>Недавно изменённый</span><small>{formatUpdatedAt(latestList.updatedAt)}</small></div>
              <button type="button" className="recent-list-feature" onClick={() => onOpen(latestList)}>
                <span className="recent-list-copy">
                  <small>{countGames(latestList)} игр</small>
                  <strong>{latestList.title}</strong>
                  <span>Продолжить редактирование <ArrowUpRight size={15} weight="bold" /></span>
                </span>
                <ListPreview list={latestList} />
              </button>
            </div>
          )}

          <div className="library-toolbar">
            <label className="library-search">
              <MagnifyingGlass size={17} weight="bold" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти тир-лист" />
            </label>
            <label className="library-sort">
              <span>Сортировка</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="updated">Сначала новые</option>
                <option value="title">По названию</option>
                <option value="games">По количеству игр</option>
              </select>
            </label>
          </div>

          {sortedLists.length ? (
            <div className="saved-grid">
              {sortedLists.map((list, index) => (
                <article className="saved-item" key={list.id} style={{ "--index": index }}>
                  <button type="button" className="saved-open" onClick={() => onOpen(list)}>
                    <span className="saved-card-top">
                      <span className="saved-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="saved-card-meta">Игры · {countGames(list)} позиций</span>
                      <ArrowUpRight className="saved-arrow" size={21} weight="bold" />
                    </span>
                    <span className="saved-card-body">
                      <span className="saved-card-copy">
                        <strong>{list.title}</strong>
                        <small>Обновлено {formatUpdatedAt(list.updatedAt)}</small>
                        <span className="saved-open-label">Открыть список <ArrowUpRight size={15} weight="bold" /></span>
                      </span>
                      <ListPreview list={list} />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="list-menu-trigger"
                    onClick={() => setOpenMenuId((current) => current === list.id ? null : list.id)}
                    aria-label={`Действия с ${list.title}`}
                    aria-expanded={openMenuId === list.id}
                  >
                    <DotsThree size={20} weight="bold" />
                  </button>
                  {openMenuId === list.id && (
                    <div className="list-action-menu">
                      <button type="button" onClick={() => { onDuplicate(list.id); setOpenMenuId(null); }}><Copy size={15} />Дублировать</button>
                      <button type="button" className="list-action-danger" onClick={() => {
                        if (window.confirm(`Удалить «${list.title}»?`)) onDelete(list.id);
                        setOpenMenuId(null);
                      }}><Trash size={15} />Удалить</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty-search"><MagnifyingGlass size={24} /><span>Тир-листы не найдены</span><small>Попробуй изменить запрос.</small></div>
          )}
        </>
      )}
    </section>
  );
}
