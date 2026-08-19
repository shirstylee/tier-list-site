import {
  ArrowDown,
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  DotsSixVertical,
  FloppyDisk,
  DownloadSimple,
  GameController,
  Info,
  MagnifyingGlass,
  Copy,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_TIERS, DEMO_GAMES, TIER_COLORS } from "../data";
import { useHistoryState } from "../hooks/useHistoryState";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { exportTierListPng } from "../lib/exportTierList";
import {
  GAME_GENRES,
  GAME_PLATFORMS,
  getGameDetails,
  hasRawgKey,
  searchGames,
} from "../lib/rawg";
import GameDetailsModal from "./GameDetailsModal";
import GameArt from "./GameArt";
import TierColorPicker from "./TierColorPicker";

const TIER_PRESETS = [
  {
    id: "classic",
    label: "S — D",
    tiers: ["S", "A", "B", "C", "D"],
  },
  {
    id: "score",
    label: "10 — 1",
    tiers: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  },
  {
    id: "verdict",
    label: "Вердикт",
    tiers: ["Шедевр", "Отлично", "Хорошо", "Средне", "Плохо"],
  },
];

const MIN_GAME_YEAR = 1970;
const MAX_GAME_YEAR = new Date().getFullYear() + 2;

function makeDraft(list) {
  if (list) {
    return {
      ...list,
      tiers: list.tiers.map((tier) => ({
        ...tier,
        games: [...tier.games],
      })),
      unranked: [...(list.unranked ?? [])],
    };
  }

  return {
    id: crypto.randomUUID(),
    title: "Мой игровой канон",
    categoryId: "games",
    updatedAt: new Date().toISOString(),
    tiers: DEFAULT_TIERS.map((tier) => ({ ...tier, games: [] })),
    unranked: [],
  };
}

function AutoGrowTextarea({
  value,
  className,
  onChange,
  focusAtEnd = false,
  ...props
}) {
  const textareaRef = useRef(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  useLayoutEffect(() => {
    if (!focusAtEnd) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }, [focusAtEnd]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      className={className}
      onChange={onChange}
    />
  );
}

function GameTile({
  game,
  selected,
  onSelect,
  onDelete,
  onMoveBackward,
  onMoveForward,
  onPointerDown,
  onDragOver,
  onDrop,
  destination,
  gameIndex,
  dropBefore = false,
  dropAfter = false,
  dropPreviewGame = null,
  dragging = false,
  compact = false,
}) {
  return (
    <div
      className={`game-tile-shell ${compact ? "game-tile-shell-compact" : ""} ${
        selected ? "game-tile-shell-selected" : ""
      } ${dropBefore ? "game-tile-drop-before" : ""} ${
        dropAfter ? "game-tile-drop-after" : ""
      } ${dragging ? "game-tile-shell-dragging" : ""}`}
      draggable={false}
      data-game-id={game.id}
      data-destination={destination}
      data-game-index={gameIndex}
      onPointerDown={(event) => onPointerDown(event, game.id, destination)}
      onDragStart={(event) => event.preventDefault()}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="game-tile"
        onClick={(event) => onSelect(game.id, event)}
        title={game.name}
        aria-pressed={selected}
      >
        <GameArt game={game} className="h-full w-full">
          <span className="game-tile-title">{game.name}</span>
        </GameArt>
      </button>
      <button
        type="button"
        className="game-remove"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(game.id);
        }}
        aria-label={`Удалить ${game.name}`}
        title="Удалить из тир-листа"
      >
        <X size={12} weight="bold" />
      </button>
      <div className="game-order-controls">
        <button
          type="button"
          disabled={!onMoveBackward}
          onClick={(event) => {
            event.stopPropagation();
            onMoveBackward?.();
          }}
          aria-label={`Переместить ${game.name} левее`}
        >
          <CaretLeft size={12} weight="bold" />
        </button>
        <button
          type="button"
          disabled={!onMoveForward}
          onClick={(event) => {
            event.stopPropagation();
            onMoveForward?.();
          }}
          aria-label={`Переместить ${game.name} правее`}
        >
          <CaretRight size={12} weight="bold" />
        </button>
      </div>
      {dropPreviewGame && (dropBefore || dropAfter) && (
        <div
          className={`game-drop-preview ${
            dropAfter
              ? "game-drop-preview-after"
              : "game-drop-preview-before"
          }`}
          aria-hidden="true"
        >
          <GameArt game={dropPreviewGame} className="h-full w-full">
            <span className="game-tile-title">{dropPreviewGame.name}</span>
          </GameArt>
          <span className="game-drop-preview-label">
            {dropAfter ? "После" : "Перед"}
          </span>
        </div>
      )}
    </div>
  );
}

function DropPlaceholder({
  compact = false,
  game = null,
  destination = "",
}) {
  return (
    <div
      className={`drop-placeholder ${
        compact ? "drop-placeholder-compact" : ""
      } ${game ? "drop-placeholder-game" : ""}`}
      data-drop-placeholder="true"
      data-game-id={game?.id ?? ""}
      data-destination={destination}
      aria-hidden="true"
    >
      {game ? (
        <GameArt game={game} className="h-full w-full">
          <span className="game-tile-title">{game.name}</span>
        </GameArt>
      ) : (
        <span>Сюда</span>
      )}
    </div>
  );
}

function LoadingGames() {
  return (
    <div className="search-loading">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="search-loading-row">
          <span className="skeleton h-14 w-20 rounded-lg" style={{ "--index": index }} />
          <span className="grid grow gap-2">
            <span
              className="skeleton h-3 w-3/4 rounded-full"
              style={{ "--index": index }}
            />
            <span
              className="skeleton h-2 w-1/2 rounded-full"
              style={{ "--index": index }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TierEditor({ initialList, onSave }) {
  const {
    value: draft,
    setValue: setDraft,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState(() => makeDraft(initialList));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(DEMO_GAMES);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    year: "",
    genre: "",
    platform: "",
    minRating: "",
  });
  const changeFilterYear = (offset) => {
    setFilters((current) => {
      const parsedYear = Number(current.year);
      const baseYear = Number.isFinite(parsedYear) && current.year
        ? parsedYear
        : new Date().getFullYear();
      const year = Math.min(
        MAX_GAME_YEAR,
        Math.max(MIN_GAME_YEAR, baseYear + offset),
      );

      return { ...current, year: String(year) };
    });
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useLocalStorage(
    "tierlist-search-history",
    [],
  );
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [detailsGame, setDetailsGame] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [draggedTierId, setDraggedTierId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOrigin, setDragOrigin] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [pointerPosition, setPointerPosition] = useState(null);
  const [pointerDragging, setPointerDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(
    initialList?.updatedAt ?? null,
  );
  const [exporting, setExporting] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const saveTimer = useRef(null);
  const autoSaveTimer = useRef(null);
  const skipFirstAutoSave = useRef(true);
  const onSaveRef = useRef(onSave);
  const searchResultsRef = useRef(null);
  const loadMoreRef = useRef(null);
  const autoScrollFrame = useRef(null);
  const autoScrollSpeed = useRef(0);
  const pointerDrag = useRef(null);
  const pointerVisual = useRef(null);
  const dropTargetRef = useRef(null);
  const suppressClick = useRef(false);
  const detailsRequestRef = useRef(null);
  const pointerHandlersRef = useRef({
    move: null,
    finish: null,
    cancel: null,
  });

  const allDraftGames = useMemo(
    () => [
      ...draft.unranked,
      ...draft.tiers.flatMap((tier) => tier.games),
    ],
    [draft],
  );

  const draggedGame = useMemo(
    () =>
      allDraftGames.find(
        (game) => String(game.id) === String(draggedId),
      ) ??
      results.find((game) => String(game.id) === String(draggedId)) ??
      null,
    [allDraftGames, draggedId, results],
  );

  const rankColumnWidth = useMemo(() => {
    const longestLabel = Math.max(
      1,
      ...draft.tiers.map((tier) => tier.label.trim().length),
    );
    return `${Math.min(240, Math.max(96, 62 + longestLabel * 7))}px`;
  }, [draft.tiers]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  useEffect(() => {
    const controller = new AbortController();
    const searchTimer = window.setTimeout(async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const response = await searchGames(query, controller.signal, {
          ...filters,
          page,
        });
        if (!controller.signal.aborted) {
          setResults((current) => {
            if (page === 1) return response.games;
            const merged = [...current, ...response.games];
            return [...new Map(merged.map((game) => [String(game.id), game])).values()];
          });
          setHasMore(response.hasMore);
          if (query.trim().length > 1 && response.games.length) {
            setRecentSearches((current) => [
              query.trim(),
              ...current.filter((item) => item !== query.trim()),
            ].slice(0, 6));
          }
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }, 260);

    return () => {
      window.clearTimeout(searchTimer);
      controller.abort();
    };
  }, [filters, page, query, setRecentSearches]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore || !loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPage((current) => current + 1);
      },
      { root: searchResultsRef.current, rootMargin: "120px" },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    if (skipFirstAutoSave.current) {
      skipFirstAutoSave.current = false;
      return undefined;
    }
    setSaveState("saving");
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      onSaveRef.current({ ...draft, updatedAt }, { silent: true });
      setLastSavedAt(updatedAt);
      setSaveState("saved");
    }, 900);
    return () => window.clearTimeout(autoSaveTimer.current);
  }, [draft]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      detailsRequestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const handleHistoryShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      if (event.target.closest("input, textarea, select")) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [redo, undo]);

  useEffect(() => {
    if (!draggedId) return undefined;

    const scrollStep = () => {
      if (autoScrollSpeed.current !== 0) {
        window.scrollBy({ top: autoScrollSpeed.current, behavior: "auto" });
      }
      autoScrollFrame.current = window.requestAnimationFrame(scrollStep);
    };

    const handleWindowDragOver = (event) => {
      const edgeSize = Math.min(140, window.innerHeight * 0.2);
      if (event.clientY < edgeSize) {
        const force = (edgeSize - event.clientY) / edgeSize;
        autoScrollSpeed.current = -Math.max(4, Math.round(force * 22));
      } else if (event.clientY > window.innerHeight - edgeSize) {
        const force =
          (event.clientY - (window.innerHeight - edgeSize)) / edgeSize;
        autoScrollSpeed.current = Math.max(4, Math.round(force * 22));
      } else {
        autoScrollSpeed.current = 0;
      }
    };

    const handleWheelWhileDragging = (event) => {
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 32
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      window.scrollBy({
        top: (event.deltaY || event.deltaX) * unit,
        behavior: "auto",
      });
    };

    window.addEventListener("dragover", handleWindowDragOver);
    document.addEventListener("wheel", handleWheelWhileDragging, {
      capture: true,
      passive: false,
    });
    autoScrollFrame.current = window.requestAnimationFrame(scrollStep);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      document.removeEventListener("wheel", handleWheelWhileDragging, true);
      if (autoScrollFrame.current) {
        window.cancelAnimationFrame(autoScrollFrame.current);
      }
      autoScrollFrame.current = null;
      autoScrollSpeed.current = 0;
    };
  }, [draggedId]);

  const toggleSelection = (gameId) => {
    setSelectedId((current) =>
      String(current) === String(gameId) ? null : gameId,
    );
  };

  const moveGame = (gameId, destination, insertionIndex) => {
    setDraft((current) => {
      const sameId = (game) => String(game.id) === String(gameId);
      let game = current.unranked.find(sameId);
      let origin = game ? "unranked" : null;
      let originIndex = game ? current.unranked.findIndex(sameId) : -1;

      if (!game) {
        for (const tier of current.tiers) {
          const index = tier.games.findIndex(sameId);
          if (index !== -1) {
            game = tier.games[index];
            origin = tier.id;
            originIndex = index;
            break;
          }
        }
      }

      game ??= results.find(sameId);
      if (!game) return current;

      const next = {
        ...current,
        unranked: current.unranked.filter((item) => !sameId(item)),
        tiers: current.tiers.map((tier) => ({
          ...tier,
          games: tier.games.filter((item) => !sameId(item)),
        })),
      };

      const destinationExists =
        destination === "unranked" ||
        next.tiers.some((tier) => tier.id === destination);
      if (!destinationExists) return current;

      const targetGamesBeforeRemoval =
        destination === "unranked"
          ? current.unranked
          : (current.tiers.find((tier) => tier.id === destination)?.games ??
            []);

      const targetGames =
        destination === "unranked"
          ? [...next.unranked]
          : [
              ...(next.tiers.find((tier) => tier.id === destination)?.games ??
                []),
            ];

      const usesProjectedIndex = Number.isInteger(insertionIndex?.index);
      let targetIndex;
      if (usesProjectedIndex) {
        targetIndex = insertionIndex.index;
      } else if (Number.isInteger(insertionIndex)) {
        targetIndex = insertionIndex;
      } else if (insertionIndex?.targetGameId != null) {
        const anchorIndex = targetGamesBeforeRemoval.findIndex(
          (item) =>
            String(item.id) === String(insertionIndex.targetGameId),
        );
        targetIndex =
          anchorIndex === -1
            ? targetGames.length
            : anchorIndex + (insertionIndex.placement === "after" ? 1 : 0);
      } else {
        targetIndex = targetGamesBeforeRemoval.length;
      }

      if (
        !usesProjectedIndex &&
        origin === destination &&
        originIndex !== -1 &&
        originIndex < targetIndex
      ) {
        targetIndex -= 1;
      }

      targetIndex = Math.max(0, Math.min(targetIndex, targetGames.length));
      targetGames.splice(targetIndex, 0, game);

      if (destination === "unranked") {
        next.unranked = targetGames;
      } else {
        next.tiers = next.tiers.map((tier) =>
          tier.id === destination ? { ...tier, games: targetGames } : tier,
        );
      }

      if (String(origin) !== String(destination)) {
        const fromLabel =
          origin === "unranked"
            ? "Без ранга"
            : current.tiers.find((tier) => tier.id === origin)?.label ?? "Каталог";
        const toLabel =
          destination === "unranked"
            ? "Без ранга"
            : current.tiers.find((tier) => tier.id === destination)?.label ?? destination;
        next.activity = [
          ...(current.activity ?? []),
          {
            id: crypto.randomUUID(),
            type: "move",
            gameId: game.id,
            gameName: game.name,
            from: fromLabel,
            to: toLabel,
            at: new Date().toISOString(),
          },
        ].slice(-120);
      }

      return next;
    });

    setSelectedId(null);
    setDraggedId(null);
    setDragOrigin(null);
    setDropTarget(null);
    setPointerPosition(null);
    setPointerDragging(false);
    dropTargetRef.current = null;
    pointerDrag.current = null;
  };

  const removeGame = (gameId) => {
    const sameId = (game) => String(game.id) === String(gameId);
    setDraft((current) => {
      const game = [
        ...current.unranked,
        ...current.tiers.flatMap((tier) => tier.games),
      ].find(sameId);
      return {
        ...current,
        unranked: current.unranked.filter((item) => !sameId(item)),
        tiers: current.tiers.map((tier) => ({
          ...tier,
          games: tier.games.filter((item) => !sameId(item)),
        })),
        activity: game
          ? [
              ...(current.activity ?? []),
              {
                id: crypto.randomUUID(),
                type: "remove",
                gameId: game.id,
                gameName: game.name,
                at: new Date().toISOString(),
              },
            ].slice(-120)
          : current.activity,
      };
    });
    setSelectedId((current) =>
      String(current) === String(gameId) ? null : current,
    );
    setDropTarget(null);
    dropTargetRef.current = null;
  };

  const addFromSearch = (game) => {
    if (allDraftGames.some((item) => String(item.id) === String(game.id))) return;
    setDraft((current) => ({
      ...current,
      unranked: [...current.unranked, game],
      activity: [
        ...(current.activity ?? []),
        {
          id: crypto.randomUUID(),
          type: "add",
          gameId: game.id,
          gameName: game.name,
          to: "unranked",
          at: new Date().toISOString(),
        },
      ].slice(-120),
    }));
    setRecentlyAdded((current) => [
      game,
      ...current.filter((item) => String(item.id) !== String(game.id)),
    ].slice(0, 6));
  };

  const updateTierLabel = (tierId, label) => {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, label } : tier,
      ),
    }));
  };

  const updateTierColor = (tierId, color) => {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, color } : tier,
      ),
    }));
  };

  const shiftTier = (index, direction) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.tiers.length) return current;
      const tiers = [...current.tiers];
      [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
      return { ...current, tiers };
    });
  };

  const deleteTier = (tierId) => {
    setDraft((current) => {
      const removed = current.tiers.find((tier) => tier.id === tierId);
      if (!removed || current.tiers.length <= 2) return current;
      return {
        ...current,
        unranked: [...current.unranked, ...removed.games],
        tiers: current.tiers.filter((tier) => tier.id !== tierId),
      };
    });
  };

  const addTier = () => {
    const index = draft.tiers.length;
    setDraft((current) => ({
      ...current,
      tiers: [
        ...current.tiers,
        {
          id: `tier-${crypto.randomUUID()}`,
          label: `Ранг ${index + 1}`,
          color: TIER_COLORS[index % TIER_COLORS.length],
          games: [],
        },
      ],
    }));
  };

  const duplicateTier = (tierId) => {
    setDraft((current) => {
      const index = current.tiers.findIndex((tier) => tier.id === tierId);
      if (index === -1) return current;
      const source = current.tiers[index];
      const tiers = [...current.tiers];
      tiers.splice(index + 1, 0, {
        ...source,
        id: `tier-${crypto.randomUUID()}`,
        label: `${source.label} копия`,
        games: [],
      });
      return { ...current, tiers };
    });
  };

  const applyTierPreset = (presetId) => {
    const preset = TIER_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setDraft((current) => {
      const overflowGames = current.tiers
        .slice(preset.tiers.length)
        .flatMap((tier) => tier.games);
      return {
        ...current,
        tiers: preset.tiers.map((label, index) => ({
          id: current.tiers[index]?.id ?? `tier-${crypto.randomUUID()}`,
          label,
          color: TIER_COLORS[index % TIER_COLORS.length],
          games: current.tiers[index]?.games ?? [],
        })),
        unranked: [...current.unranked, ...overflowGames],
      };
    });
  };

  const moveTierTo = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    setDraft((current) => {
      const sourceIndex = current.tiers.findIndex((tier) => tier.id === sourceId);
      const targetIndex = current.tiers.findIndex((tier) => tier.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const tiers = [...current.tiers];
      const [tier] = tiers.splice(sourceIndex, 1);
      tiers.splice(targetIndex, 0, tier);
      return { ...current, tiers };
    });
  };

  const saveDraft = () => {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    skipFirstAutoSave.current = true;
    setDraft(next, { record: false });
    onSaveRef.current(next);
    setLastSavedAt(next.updatedAt);
    setSaveState("saved");
    setSaved(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaved(false), 1800);
  };

  const exportImage = async () => {
    setExporting(true);
    try {
      await exportTierListPng(draft);
    } finally {
      setExporting(false);
    }
  };

  const openGameDetails = async (game) => {
    detailsRequestRef.current?.abort();
    const controller = new AbortController();
    detailsRequestRef.current = controller;
    setDetailsOpen(true);
    setDetailsGame(game);
    setDetailsLoading(true);
    setDetailsError("");
    try {
      setDetailsGame(await getGameDetails(game, controller.signal));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setDetailsGame(game);
        setDetailsError(requestError.message);
      }
    } finally {
      if (detailsRequestRef.current === controller) {
        detailsRequestRef.current = null;
        setDetailsLoading(false);
      }
    }
  };

  const closeGameDetails = () => {
    detailsRequestRef.current?.abort();
    detailsRequestRef.current = null;
    setDetailsLoading(false);
    setDetailsOpen(false);
  };

  const beginDrag = (gameId, origin) => {
    setDraggedId(gameId);
    setDragOrigin(origin);
    setSelectedId(null);
  };

  const endDrag = () => {
    setDraggedId(null);
    setDragOrigin(null);
    setDropTarget(null);
    setPointerPosition(null);
    setPointerDragging(false);
    dropTargetRef.current = null;
    pointerDrag.current = null;
  };

  const updateDropTarget = (nextTarget) => {
    dropTargetRef.current = nextTarget;
    setDropTarget((current) =>
      current?.destination === nextTarget.destination &&
      current.index === nextTarget.index
        ? current
        : nextTarget,
    );
  };

  const getDropTargetFromCard = (
    card,
    cards,
    clientX,
    destination,
  ) => {
    const draggedGameId = pointerDrag.current?.gameId ?? draggedId;
    const cardIndex = cards.indexOf(card);
    const draggedCardIndex = cards.findIndex(
      (item) => String(item.dataset.gameId) === String(draggedGameId),
    );

    if (String(card.dataset.gameId) === String(draggedGameId)) {
      if (
        String(dropTargetRef.current?.destination) === String(destination)
      ) {
        return dropTargetRef.current;
      }
      return {
        destination,
        index: Math.max(0, Math.min(cardIndex, cards.length - 1)),
      };
    }

    const bounds = card.getBoundingClientRect();
    const after = clientX > bounds.left + bounds.width / 2;
    let index =
      cardIndex -
      (draggedCardIndex !== -1 && cardIndex > draggedCardIndex ? 1 : 0) +
      (after ? 1 : 0);
    const availableSlots = cards.length - (draggedCardIndex !== -1 ? 1 : 0);
    index = Math.max(0, Math.min(index, availableSlots));

    return { destination, index };
  };

  const getClosestDropTarget = (zone, clientX, clientY, destination) => {
    const cards = Array.from(
      zone.querySelectorAll(
        ":scope > .game-tile-shell, :scope > .drop-placeholder[data-drop-placeholder]",
      ),
    );

    if (cards.length === 0) {
      return { destination, index: 0 };
    }

    let closest = null;
    cards.forEach((card) => {
      const bounds = card.getBoundingClientRect();
      const deltaX =
        clientX < bounds.left
          ? bounds.left - clientX
          : clientX > bounds.right
            ? clientX - bounds.right
            : 0;
      const deltaY =
        clientY < bounds.top
          ? bounds.top - clientY
          : clientY > bounds.bottom
            ? clientY - bounds.bottom
            : 0;
      const distance = deltaX * deltaX + deltaY * deltaY;

      if (!closest || distance < closest.distance) {
        closest = {
          distance,
          card,
        };
      }
    });

    return getDropTargetFromCard(
      closest.card,
      cards,
      clientX,
      destination,
    );
  };

  const markDropPosition = (event, destination) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    const cards = Array.from(
      event.currentTarget.parentElement.querySelectorAll(
        ":scope > .game-tile-shell, :scope > .drop-placeholder[data-drop-placeholder]",
      ),
    );
    updateDropTarget(
      getDropTargetFromCard(
        event.currentTarget,
        cards,
        event.clientX,
        destination,
      ),
    );
  };

  const markDropInZone = (event, destination) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    updateDropTarget(
      getClosestDropTarget(
        event.currentTarget,
        event.clientX,
        event.clientY,
        destination,
      ),
    );
  };

  const handleDrop = (destination, event) => {
    event.preventDefault();
    const gameId = event.dataTransfer.getData("text/plain") || draggedId;
    const target =
      dropTargetRef.current?.destination === destination
        ? dropTargetRef.current
        : undefined;
    moveGame(gameId, destination, target);
  };

  const handleDropAtGame = (destination, event) => {
    event.preventDefault();
    event.stopPropagation();
    const gameId = event.dataTransfer.getData("text/plain") || draggedId;
    const cards = Array.from(
      event.currentTarget.parentElement.querySelectorAll(
        ":scope > .game-tile-shell, :scope > .drop-placeholder[data-drop-placeholder]",
      ),
    );
    moveGame(
      gameId,
      destination,
      getDropTargetFromCard(
        event.currentTarget,
        cards,
        event.clientX,
        destination,
      ),
    );
  };

  const beginPointerDrag = (event, gameId, origin) => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      pointerDrag.current ||
      event.target.closest(".game-remove, .game-order-controls")
    ) {
      return;
    }

    pointerDrag.current = {
      pointerId: event.pointerId,
      gameId,
      origin,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      captureTarget: event.currentTarget,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events used in tests do not own pointer capture.
    }
  };

  const updatePointerAutoScroll = (clientY) => {
    const edgeSize = Math.min(140, window.innerHeight * 0.2);
    if (clientY < edgeSize) {
      const force = (edgeSize - clientY) / edgeSize;
      autoScrollSpeed.current = -Math.max(4, Math.round(force * 22));
    } else if (clientY > window.innerHeight - edgeSize) {
      const force =
        (clientY - (window.innerHeight - edgeSize)) / edgeSize;
      autoScrollSpeed.current = Math.max(4, Math.round(force * 22));
    } else {
      autoScrollSpeed.current = 0;
    }
  };

  const updatePointerDropTarget = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    const card = element?.closest(
      ".game-tile-shell[data-destination], .drop-placeholder[data-drop-placeholder]",
    );

    if (card) {
      const zone = card.parentElement;
      const cards = Array.from(
        zone.querySelectorAll(
          ":scope > .game-tile-shell, :scope > .drop-placeholder[data-drop-placeholder]",
        ),
      );
      updateDropTarget(
        getDropTargetFromCard(
          card,
          cards,
          clientX,
          card.dataset.destination,
        ),
      );
      return;
    }

    const zone = element?.closest("[data-dropzone]");
    if (zone) {
      updateDropTarget(
        getClosestDropTarget(
          zone,
          clientX,
          clientY,
          zone.dataset.dropzone,
        ),
      );
      return;
    }

    dropTargetRef.current = null;
    setDropTarget(null);
  };

  const movePointerDrag = (event) => {
    const current = pointerDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;

    if (event.pointerType !== "touch" && event.buttons === 0) {
      cancelPointerDrag();
      return;
    }

    const distance = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    );
    if (!current.active && distance < 6) return;

    const justStarted = !current.active;
    if (justStarted) {
      current.active = true;
      beginDrag(current.gameId, current.origin);
      setPointerDragging(true);
      if (current.origin === "catalog" && event.pointerType === "touch") {
        setCatalogOpen(false);
      }
    }

    event.preventDefault();
    if (justStarted || !pointerVisual.current) {
      setPointerPosition({ x: event.clientX, y: event.clientY });
    } else {
      pointerVisual.current.style.setProperty(
        "--drag-x",
        `${event.clientX}px`,
      );
      pointerVisual.current.style.setProperty(
        "--drag-y",
        `${event.clientY}px`,
      );
    }
    updatePointerAutoScroll(event.clientY);
    updatePointerDropTarget(event.clientX, event.clientY);
  };

  const finishPointerDrag = (event) => {
    const current = pointerDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;

    try {
      if (current.captureTarget?.hasPointerCapture?.(event.pointerId)) {
        current.captureTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already be released by the browser.
    }
    if (!current.active) {
      pointerDrag.current = null;
      return;
    }

    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);

    updatePointerDropTarget(event.clientX, event.clientY);
    const target = dropTargetRef.current;
    if (target) {
      moveGame(current.gameId, target.destination, target);
    } else {
      endDrag();
    }
  };

  const cancelPointerDrag = () => {
    const current = pointerDrag.current;
    if (current?.active) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }

    try {
      if (
        current?.captureTarget?.hasPointerCapture?.(current.pointerId)
      ) {
        current.captureTarget.releasePointerCapture(current.pointerId);
      }
    } catch {
      // Pointer capture may already be released by the browser.
    }

    endDrag();
  };

  pointerHandlersRef.current = {
    move: movePointerDrag,
    finish: finishPointerDrag,
    cancel: cancelPointerDrag,
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      pointerHandlersRef.current.move?.(event);
    };
    const handlePointerUp = (event) => {
      pointerHandlersRef.current.finish?.(event);
    };
    const handlePointerCancel = () => {
      pointerHandlersRef.current.cancel?.();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pointerHandlersRef.current.cancel?.();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && pointerDrag.current) {
        pointerHandlersRef.current.cancel?.();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);
    window.addEventListener("blur", handlePointerCancel);
    window.addEventListener("pagehide", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);
      window.removeEventListener("blur", handlePointerCancel);
      window.removeEventListener("pagehide", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  const handleGameSelect = (gameId, event) => {
    if (suppressClick.current) {
      event?.preventDefault();
      return;
    }
    toggleSelection(gameId);
  };

  const previewGames = (games, destination) => {
    if (!draggedGame || !dropTarget) return games;

    const isSource = String(dragOrigin) === String(destination);
    const isDestination =
      String(dropTarget.destination) === String(destination);
    if (!isSource && !isDestination) return games;

    if (isSource && !isDestination) {
      return games;
    }

    const projected = games.filter(
      (game) => String(game.id) !== String(draggedGame.id),
    );

    const insertionIndex = Math.max(
      0,
      Math.min(dropTarget.index ?? projected.length, projected.length),
    );

    projected.splice(
      insertionIndex,
      0,
      isSource
        ? draggedGame
        : {
            ...draggedGame,
            id: `drop-preview-${draggedGame.id}`,
            originalId: draggedGame.id,
            isDropPlaceholder: true,
          },
    );
    return projected;
  };

  const finishTitleEditing = () => {
    setDraft((current) => ({
      ...current,
      title: current.title.trim() || "Без названия",
    }));
    setTitleEditing(false);
  };

  const tierGamePreviews = new Map(
    draft.tiers.map((tier) => [
      tier.id,
      previewGames(tier.games, tier.id),
    ]),
  );
  const unrankedPreview = previewGames(draft.unranked, "unranked");
  const savedTimeLabel = lastSavedAt
    ? new Intl.DateTimeFormat("ru", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastSavedAt))
    : "ещё не сохранено";

  return (
    <main className="editor">
      <section className="editor-head">
        <div className="editor-title-block">
          <p className="eyebrow mb-3">Редактор · Игры</p>
          <div className="title-editor">
            {titleEditing ? (
              <AutoGrowTextarea
                className="title-input"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    finishTitleEditing();
                  }
                  if (event.key === "Escape") finishTitleEditing();
                }}
                aria-label="Название тир-листа"
                focusAtEnd
              />
            ) : (
              <h1 className="title-display">{draft.title}</h1>
            )}
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/42">
            Перетаскивай обложки или выбери игру, а затем нажми на нужный ранг.
            Повторное нажатие снимает выбор.
          </p>
        </div>
        <div className="editor-actions">
            <button
              type="button"
              className={`title-edit-button ${
                titleEditing ? "title-edit-button-active" : ""
              }`}
              onClick={() =>
                titleEditing ? finishTitleEditing() : setTitleEditing(true)
              }
            >
              {titleEditing ? (
                <Check size={16} weight="bold" />
              ) : (
                <PencilSimple size={16} weight="bold" />
              )}
              {titleEditing ? "Готово" : "Изменить название"}
            </button>
          <button
            type="button"
            className={`save-button ${saved ? "save-button-done" : ""}`}
            onClick={saveDraft}
          >
            {saved ? (
              <Check size={19} weight="bold" />
            ) : (
              <FloppyDisk size={19} weight="bold" />
            )}
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        </div>
      </section>

      <div className="editor-utility-bar">
        <div className="history-actions" aria-label="История изменений">
          <button type="button" onClick={undo} disabled={!canUndo} title="Отменить (Ctrl+Z)">
            <ArrowCounterClockwise size={17} weight="bold" />
            <span>Отменить</span>
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Повторить (Ctrl+Shift+Z)">
            <ArrowClockwise size={17} weight="bold" />
            <span>Повторить</span>
          </button>
        </div>
        <span className={`autosave-status autosave-status-${saveState}`}>
          <span className="status-pulse" />
          {saveState === "saving"
            ? "Сохранение…"
            : lastSavedAt
              ? `Сохранено в ${savedTimeLabel}`
              : "Ещё не сохранено"}
        </span>
        <button type="button" className="export-image-button" onClick={exportImage} disabled={exporting}>
          <DownloadSimple size={17} weight="bold" />
          {exporting ? "Создание PNG…" : "Скачать PNG"}
        </button>
      </div>

      <div className="editor-layout">
        <section
          className="tier-board"
          aria-label="Тир-лист"
          style={{ "--rank-column": rankColumnWidth }}
        >
          <div className="board-tools">
            <label>
              <span>Шаблон рангов</span>
              <select defaultValue="" onChange={(event) => {
                applyTierPreset(event.target.value);
                event.target.value = "";
              }}>
                <option value="" disabled>Выбрать</option>
                {TIER_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
            </label>
            <small>Цвет, название и порядок каждого ранга можно изменить отдельно.</small>
          </div>
          <div className="board-meta">
            <span>Ранг</span>
            <span>Игры · {allDraftGames.length - draft.unranked.length}</span>
          </div>

          <div className="tier-rows">
            {draft.tiers.map((tier, tierIndex) => (
              <div
                key={tier.id}
                className={`tier-row ${
                  selectedId || draggedId ? "tier-row-ready" : ""
                } ${draggedTierId === tier.id ? "tier-row-dragging" : ""}`}
                onDragOver={(event) => {
                  if (!draggedTierId) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!draggedTierId) return;
                  event.preventDefault();
                  moveTierTo(draggedTierId, tier.id);
                  setDraggedTierId(null);
                }}
                onClick={(event) => {
                  if (
                    event.target.closest("button, textarea") ||
                    !selectedId
                  ) {
                    return;
                  }
                  moveGame(selectedId, tier.id);
                }}
              >
                <div className="tier-label" style={{ background: tier.color }}>
                  <button
                    type="button"
                    className="tier-drag-handle"
                    draggable
                    onDragStart={(event) => {
                      setDraggedTierId(tier.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedTierId(null)}
                    aria-label={`Перетащить ранг ${tier.label}`}
                    title="Перетащить ранг"
                  >
                    <DotsSixVertical size={14} weight="bold" />
                  </button>
                  <AutoGrowTextarea
                    value={tier.label}
                    onChange={(event) =>
                      updateTierLabel(tier.id, event.target.value)
                    }
                    aria-label={`Название ранга ${tier.label}`}
                  />
                  <div className="tier-controls">
                    <TierColorPicker
                      value={tier.color.startsWith("#") ? tier.color : TIER_COLORS[tierIndex % TIER_COLORS.length]}
                      onChange={(color) => updateTierColor(tier.id, color)}
                      label={tier.label}
                      palette={TIER_COLORS}
                    />
                    <button
                      type="button"
                      onClick={() => duplicateTier(tier.id)}
                      aria-label="Дублировать ранг"
                      title="Дублировать ранг"
                    >
                      <Copy size={11} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={tierIndex === 0}
                      onClick={() => shiftTier(tierIndex, -1)}
                      aria-label="Переместить ранг выше"
                    >
                      <ArrowUp size={11} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={tierIndex === draft.tiers.length - 1}
                      onClick={() => shiftTier(tierIndex, 1)}
                      aria-label="Переместить ранг ниже"
                    >
                      <ArrowDown size={11} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={draft.tiers.length <= 2}
                      onClick={() => deleteTier(tier.id)}
                      aria-label="Удалить ранг"
                    >
                      <Trash size={11} weight="bold" />
                    </button>
                  </div>
                </div>

                <div
                  className={`tier-dropzone ${
                    String(dropTarget?.destination) === String(tier.id)
                      ? "tier-dropzone-active"
                      : ""
                  }`}
                  data-dropzone={tier.id}
                  onDragOver={(event) => markDropInZone(event, tier.id)}
                  onDrop={(event) => handleDrop(tier.id, event)}
                >
                  {tierGamePreviews
                    .get(tier.id)
                    .map((game, gameIndex, visibleGames) =>
                      game.isDropPlaceholder ? (
                        <DropPlaceholder
                          key={game.id}
                          compact
                          game={draggedGame}
                          destination={tier.id}
                        />
                      ) : (
                        <GameTile
                          key={game.id}
                          game={game}
                          compact
                          destination={tier.id}
                          gameIndex={gameIndex}
                          dragging={String(draggedId) === String(game.id)}
                          selected={String(selectedId) === String(game.id)}
                          onSelect={handleGameSelect}
                          onDelete={removeGame}
                          onMoveBackward={
                            gameIndex > 0
                              ? () =>
                                  moveGame(
                                    game.id,
                                    tier.id,
                                    gameIndex - 1,
                                  )
                              : null
                          }
                          onMoveForward={
                            gameIndex < visibleGames.length - 1
                              ? () =>
                                  moveGame(
                                    game.id,
                                    tier.id,
                                    gameIndex + 2,
                                  )
                              : null
                          }
                          onPointerDown={beginPointerDrag}
                          onDragOver={(event) =>
                            markDropPosition(event, tier.id)
                          }
                          onDrop={(event) =>
                            handleDropAtGame(tier.id, event)
                          }
                        />
                      ),
                    )}
                  {tierGamePreviews.get(tier.id).length === 0 && (
                    <span className="drop-hint">
                      {selectedId ? "Нажми сюда" : "Перетащи игру"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="add-tier" onClick={addTier}>
            <Plus size={15} weight="bold" />
            Добавить ранг
          </button>

          <div
            className={`unranked-zone ${
              selectedId || draggedId ? "unranked-zone-ready" : ""
            }`}
            onClick={(event) => {
              if (event.target.closest("button") || !selectedId) return;
              moveGame(selectedId, "unranked");
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-extrabold tracking-[0.01em] text-white">
                  Без ранга
                </h3>
                <p className="mt-1 text-xs text-white/36">
                  Нажми повторно на выбранную обложку, чтобы снять выбор
                </p>
              </div>
              {selectedId && (
                <button
                  type="button"
                  className="selection-cancel"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={13} weight="bold" />
                  Снять выбор
                </button>
              )}
            </div>

            <div
              className={`game-pool-grid ${
                dropTarget?.destination === "unranked"
                  ? "game-pool-grid-active"
                  : ""
              }`}
              data-dropzone="unranked"
              onDragOver={(event) => markDropInZone(event, "unranked")}
              onDrop={(event) => handleDrop("unranked", event)}
            >
              {unrankedPreview.map((game, gameIndex, visibleGames) =>
                game.isDropPlaceholder ? (
                  <DropPlaceholder
                    key={game.id}
                    game={draggedGame}
                    destination="unranked"
                  />
                ) : (
                  <GameTile
                      key={game.id}
                      game={game}
                      destination="unranked"
                      gameIndex={gameIndex}
                      dragging={String(draggedId) === String(game.id)}
                      selected={String(selectedId) === String(game.id)}
                      onSelect={handleGameSelect}
                      onDelete={removeGame}
                      onMoveBackward={
                        gameIndex > 0
                          ? () =>
                              moveGame(
                                game.id,
                                "unranked",
                                gameIndex - 1,
                              )
                          : null
                      }
                      onMoveForward={
                        gameIndex < visibleGames.length - 1
                          ? () =>
                              moveGame(
                                game.id,
                                "unranked",
                                gameIndex + 2,
                              )
                          : null
                      }
                      onPointerDown={beginPointerDrag}
                      onDragOver={(event) =>
                        markDropPosition(event, "unranked")
                      }
                      onDrop={(event) =>
                        handleDropAtGame("unranked", event)
                      }
                    />
                ),
              )}
              {unrankedPreview.length === 0 && (
                  <div className="unranked-empty">
                    <Plus size={20} weight="thin" />
                    <span>Список пуст</span>
                    <small>Добавь игры из каталога справа</small>
                  </div>
              )}
            </div>
          </div>
        </section>

        <button
          type="button"
          className="mobile-catalog-toggle"
          onClick={() => setCatalogOpen(true)}
        >
          <GameController size={19} weight="bold" />
          Открыть каталог
        </button>

        <aside className={`game-search ${catalogOpen ? "game-search-open" : ""}`}>
          <button
            type="button"
            className="mobile-catalog-backdrop"
            onClick={() => setCatalogOpen(false)}
            aria-label="Закрыть каталог"
          />
          <div className="game-search-panel sticky top-[105px]">
            <div className="game-search-header">
              <div className="catalog-heading">
                <div>
                  <p className="eyebrow mb-3">Каталог</p>
                  <h2 className="font-display text-2xl font-black tracking-[0.01em] text-white">
                    Добавить игры
                  </h2>
                </div>
                <button
                  type="button"
                  className="mobile-catalog-close"
                  onClick={() => setCatalogOpen(false)}
                  aria-label="Закрыть каталог"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <label className="search-field">
                <MagnifyingGlass size={19} weight="bold" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Название игры"
                  aria-label="Найти игру"
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Очистить поиск"
                  >
                    <X size={15} weight="bold" />
                  </button>
                )}
              </label>

              <button
                type="button"
                className="search-filter-toggle"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
              >
                Фильтры
                <span>{Object.values(filters).filter(Boolean).length || "—"}</span>
              </button>

              {filtersOpen && (
                <div className="search-filters">
                  <label>
                    <span>Год</span>
                    <span className="filter-number-field">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={MIN_GAME_YEAR}
                        max={MAX_GAME_YEAR}
                        value={filters.year}
                        placeholder="Любой"
                        onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
                      />
                      <span className="filter-number-stepper" aria-hidden="false">
                        <button
                          type="button"
                          onClick={() => changeFilterYear(1)}
                          aria-label="Увеличить год"
                        >
                          <CaretUp size={10} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => changeFilterYear(-1)}
                          aria-label="Уменьшить год"
                        >
                          <CaretDown size={10} weight="bold" />
                        </button>
                      </span>
                    </span>
                  </label>
                  <label>
                    <span>Жанр</span>
                    <select value={filters.genre} onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}>
                      {GAME_GENRES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Платформа</span>
                    <select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}>
                      {GAME_PLATFORMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Рейтинг</span>
                    <select value={filters.minRating} onChange={(event) => setFilters((current) => ({ ...current, minRating: event.target.value }))}>
                      <option value="">Любой</option>
                      <option value="4">От 4.0</option>
                      <option value="3">От 3.0</option>
                      <option value="2">От 2.0</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => setFilters({ year: "", genre: "", platform: "", minRating: "" })}>
                    Сбросить
                  </button>
                </div>
              )}

              {!query && recentSearches.length > 0 && (
                <div className="search-history">
                  <span>Недавние запросы</span>
                  <div>
                    {recentSearches.map((item) => (
                      <button type="button" key={item} onClick={() => setQuery(item)}>{item}</button>
                    ))}
                  </div>
                </div>
              )}

              {recentlyAdded.length > 0 && (
                <div className="recently-added">
                  <span>Недавно добавлены</span>
                  <div>
                    {recentlyAdded.map((game) => (
                      <button type="button" key={game.id} onClick={() => openGameDetails(game)} title={game.name}>
                        <GameArt game={game} className="h-8 w-12 rounded-md" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!hasRawgKey && (
                <div className="api-notice">
                  <span className="status-pulse" />
                  <p>
                    Демо-каталог. Добавь <code>VITE_RAWG_API_KEY</code> в{" "}
                    <code>.env</code>, чтобы включить RAWG.
                  </p>
                </div>
              )}

              {error && (
                <div className="error-notice">
                  <WarningCircle size={18} weight="bold" />
                  <span>{error}</span>
                </div>
              )}

              <div className="search-summary">
                <span>{query.trim() ? "Результаты" : "Популярное"}</span>
                <span>{loading ? "—" : results.length}</span>
              </div>
            </div>

            <div className="search-results" ref={searchResultsRef}>
              {loading ? (
                <LoadingGames />
              ) : results.length ? (
                results.map((game, index) => {
                  const added = allDraftGames.some(
                    (item) => String(item.id) === String(game.id),
                  );
                  return (
                    <div className="search-result-shell" key={game.id} style={{ "--index": index }}>
                      <button
                        type="button"
                        className={`search-result ${added ? "search-result-added" : ""}`}
                        title={added ? `${game.name} — уже добавлена` : game.name}
                        aria-label={added ? `${game.name}, уже добавлена` : `Добавить ${game.name}`}
                        onClick={(event) => {
                          if (suppressClick.current) {
                            event.preventDefault();
                            return;
                          }
                          addFromSearch(game);
                        }}
                        disabled={added}
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        onPointerDown={(event) => beginPointerDrag(event, game.id, "catalog")}
                      >
                        <GameArt game={game} className="h-14 w-20 shrink-0 rounded-lg" />
                        <span className="min-w-0 grow text-left">
                          <strong className="search-game-title block truncate text-[13px] text-white">{game.name}</strong>
                          <small className="mt-1 block font-mono text-[11px] text-white/35">
                            {game.released?.slice(0, 4) ?? "—"} · {Number.isFinite(game.rating) ? game.rating.toFixed(1) : "—"}
                          </small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="result-info"
                        onClick={() => openGameDetails(game)}
                        aria-label={`Информация об игре ${game.name}`}
                        title="Подробнее"
                      >
                        <Info size={13} weight="bold" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="search-empty">
                  <MagnifyingGlass size={24} weight="thin" />
                  <span>Ничего не найдено</span>
                  <small>Проверь название или попробуй короче</small>
                </div>
              )}
              {hasMore && <span ref={loadMoreRef} className="search-load-more" />}
              {loadingMore && <span className="search-loading-more">Загружаем ещё…</span>}
            </div>
          </div>
        </aside>
      </div>
      {pointerDragging && draggedGame && pointerPosition && (
        <div
          ref={pointerVisual}
          className="pointer-drag-card"
          style={{
            "--drag-x": `${pointerPosition.x}px`,
            "--drag-y": `${pointerPosition.y}px`,
          }}
          aria-hidden="true"
        >
          <GameArt game={draggedGame} className="h-full w-full">
            <span className="game-tile-title">{draggedGame.name}</span>
          </GameArt>
        </div>
      )}
      <GameDetailsModal
        open={detailsOpen}
        game={detailsGame}
        loading={detailsLoading}
        error={detailsError}
        onRetry={() => detailsGame && openGameDetails(detailsGame)}
        onClose={closeGameDetails}
      />
    </main>
  );
}
