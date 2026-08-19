import { ArrowLeft, LockSimple } from "@phosphor-icons/react";

export default function UnavailableView({ category, onBack }) {
  return (
    <main className="unavailable">
      <span className="unavailable-word" aria-hidden="true">
        {category.label}
      </span>
      <div className="relative max-w-xl">
        <span className="mb-7 grid h-14 w-14 place-items-center rounded-full border border-blue/50 text-blue">
          <LockSimple size={24} weight="bold" />
        </span>
        <p className="eyebrow mb-4">Раздел в разработке</p>
        <h1 className="font-display text-5xl font-black leading-[0.94] tracking-[0.005em] text-white md:text-7xl">
          {category.label} будут следующими.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-white/48">
          Сейчас редактор полностью работает для игр. Категория уже на месте и
          ждёт подключения своего источника данных.
        </p>
        <button type="button" className="text-button mt-8" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Вернуться к играм
        </button>
      </div>
    </main>
  );
}
