import { ArrowRight, Lightning, TrendUp } from "@phosphor-icons/react";
import Brand from "./Brand";
import GameArt from "./GameArt";
import { DEMO_GAMES } from "../data";

export default function Hero({ onCreate, onOpenFeatured }) {
  return (
    <section className="hero">
      <div className="hero-radar" aria-hidden="true" />
      <div className="hero-number" aria-hidden="true">
        01
      </div>

      <div className="hero-copy">
        <p className="eyebrow reveal reveal-1">
          <Lightning size={14} weight="fill" />
          Тир-листы без лишнего
        </p>
        <div className="reveal reveal-2">
          <Brand />
        </div>
        <p className="hero-subtitle reveal reveal-3">
          Расставь игры так, как они того заслуживают. Сохрани мнение.
          Вернись и передумай.
        </p>
        <div className="reveal reveal-4 flex flex-wrap items-center gap-3">
          <button type="button" className="primary-button magnetic" onClick={onCreate}>
            Создать тир-лист
            <ArrowRight size={18} weight="bold" />
          </button>
          <button type="button" className="text-button" onClick={onOpenFeatured}>
            <TrendUp size={18} weight="bold" />
            Смотреть пример
          </button>
        </div>
      </div>

      <button
        className="hero-stack reveal reveal-3"
        onClick={onOpenFeatured}
        type="button"
        aria-label="Открыть пример тир-листа"
      >
        <div className="stack-line" aria-hidden="true" />
        {DEMO_GAMES.slice(0, 3).map((game, index) => (
          <GameArt
            game={game}
            eager
            key={game.id}
            className={`stack-cover stack-cover-${index + 1}`}
          >
            <span className="stack-rank">0{index + 1}</span>
            <span className="stack-title">{game.name}</span>
          </GameArt>
        ))}
        <span className="stack-caption">
          <span>Текущий топ</span>
          <span className="font-mono">3 / 148</span>
        </span>
      </button>

      <div className="hero-footnote">
        <span className="h-px w-10 bg-blue" />
        Powered by RAWG
      </div>
    </section>
  );
}
