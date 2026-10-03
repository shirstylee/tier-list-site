import {
  ArrowClockwise,
  ArrowSquareOut,
  CalendarBlank,
  GameController,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import GameArt from "./GameArt";
import Modal from "./Modal";
import { isSafeUrl } from "../lib/dataValidation";

export default function GameDetailsModal({ game, open, onClose, loading, error, onRetry }) {
  return (
    <Modal open={open} onClose={onClose} title="Об игре" className="game-details-modal">
      {loading || !game ? (
        <div className="game-details-loading">
          <span className="skeleton game-details-cover-skeleton" />
          <span className="grid gap-3">
            <span className="skeleton h-6 w-3/4 rounded-full" />
            <span className="skeleton h-3 w-full rounded-full" />
            <span className="skeleton h-3 w-5/6 rounded-full" />
          </span>
        </div>
      ) : (
        <div className="game-details-content">
          <GameArt game={game} className="game-details-cover" />
          <div className="game-details-copy">
            <h3>{game.name}</h3>
            {error && (
              <div className="game-details-error">
                <WarningCircle size={18} weight="bold" />
                <div>
                  <strong>RAWG сейчас недоступен</strong>
                  <span>{error}</span>
                </div>
                <button type="button" onClick={onRetry}>
                  <ArrowClockwise size={14} weight="bold" />
                  Повторить
                </button>
              </div>
            )}
            <div className="game-details-meta">
              <span><CalendarBlank size={15} />{game.released?.slice(0, 4) || "—"}</span>
              <span><Star size={15} weight="fill" />RAWG {Number.isFinite(game.rating) ? game.rating.toFixed(1) : "—"}</span>
              {game.metacritic && <span>Metacritic {game.metacritic}</span>}
              <span><GameController size={15} />{game.platforms?.slice(0, 2).map((item) => item.name).join(", ") || "Платформы не указаны"}</span>
            </div>
            <div className="game-details-tags">
              {game.genres?.map((genre) => <span key={genre.id ?? genre.slug}>{genre.name}</span>)}
            </div>
            {(game.developers?.length > 0 || game.publishers?.length > 0) && (
              <dl className="game-details-facts">
                {game.developers?.length > 0 && (
                  <div><dt>Разработчик</dt><dd>{game.developers.map((item) => item.name).join(", ")}</dd></div>
                )}
                {game.publishers?.length > 0 && (
                  <div><dt>Издатель</dt><dd>{game.publishers.map((item) => item.name).join(", ")}</dd></div>
                )}
              </dl>
            )}
            {!error && <p>{game.description || "В RAWG пока нет подробного описания этой игры."}</p>}
            {!error && isSafeUrl(game.sourceUrl) && (
              <a className="game-details-source" href={game.sourceUrl} target="_blank" rel="noreferrer">
                Данные предоставлены RAWG
                <ArrowSquareOut size={14} weight="bold" />
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
