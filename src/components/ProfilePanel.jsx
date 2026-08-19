import {
  Camera,
  Crown,
  DownloadSimple,
  DeviceMobile,
  Fire,
  GameController,
  PencilLine,
  Trash,
  Trophy,
  UploadSimple,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

const MAX_AVATAR_SIZE = 1.5 * 1024 * 1024;

function mostCommon(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? "—";
}

export default function ProfilePanel({
  open,
  onClose,
  lists,
  profile,
  onProfileChange,
  onExport,
  onImport,
  onInstall,
}) {
  const avatarInputRef = useRef(null);
  const importInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const ranked = lists.reduce(
    (sum, list) =>
      sum + list.tiers.reduce((tierSum, tier) => tierSum + tier.games.length, 0),
    0,
  );
  const sRanked = lists.reduce(
    (sum, list) => sum + (list.tiers[0]?.games.length ?? 0),
    0,
  );
  const unranked = lists.reduce((sum, list) => sum + list.unranked.length, 0);
  const allGames = lists.flatMap((list) => [
    ...list.unranked,
    ...list.tiers.flatMap((tier) => tier.games),
  ]);
  const uniqueGames = [...new Map(allGames.map((game) => [String(game.id), game])).values()];
  const years = uniqueGames
    .map((game) => Number(game.released?.slice(0, 4)))
    .filter(Number.isFinite);
  const averageYear = years.length
    ? Math.round(years.reduce((sum, year) => sum + year, 0) / years.length)
    : "—";
  const favoriteGenre = mostCommon(uniqueGames.flatMap((game) => game.genres?.map((genre) => genre.name) ?? []));
  const favoriteDeveloper = mostCommon(uniqueGames.flatMap((game) => game.developers?.map((developer) => developer.name) ?? []));
  const completion = ranked + unranked ? Math.round((ranked / (ranked + unranked)) * 100) : 0;
  const topGames = [...new Map(
    lists.flatMap((list) => list.tiers[0]?.games ?? []).map((game) => [String(game.id), game]),
  ).values()].slice(0, 10);
  const tierCounts = new Map();
  lists.forEach((list) => list.tiers.forEach((tier) => {
    tierCounts.set(tier.label, (tierCounts.get(tier.label) ?? 0) + tier.games.length);
  }));
  const activity = lists
    .flatMap((list) => list.activity ?? [])
    .sort((first, second) => new Date(second.at) - new Date(first.at))
    .slice(0, 6);

  const stats = [
    { label: "Списков", value: lists.length, icon: Trophy },
    { label: "Оценено", value: ranked, icon: GameController },
    { label: "В S-ранге", value: sRanked, icon: Crown },
  ];

  const initials =
    profile.nickname.trim().slice(0, 2).toLocaleUpperCase("ru") || "P1";

  const changeAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Выбери изображение в формате JPG, PNG или WebP.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("Размер изображения должен быть не больше 1,5 МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onProfileChange({ ...profile, avatar: reader.result });
      setAvatarError("");
    };
    reader.onerror = () => setAvatarError("Не удалось прочитать изображение.");
    reader.readAsDataURL(file);
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const result = onImport(payload);
      setTransferMessage(result.message);
    } catch {
      setTransferMessage("Файл повреждён или имеет неверный формат.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Профиль"
      className="profile-modal"
    >
      <div className="profile-editor">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Аватар профиля" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <div className="profile-identity">
          <strong>{profile.nickname.trim() || "Без никнейма"}</strong>
          <span>Локальный профиль</span>
        </div>

        <button
          type="button"
          className={`profile-action profile-edit-toggle ${
            editing ? "profile-edit-toggle-active" : ""
          }`}
          onClick={() => setEditing((current) => !current)}
          aria-label={
            editing
              ? "Завершить редактирование профиля"
              : "Редактировать профиль"
          }
          aria-pressed={editing}
          title={editing ? "Готово" : "Редактировать профиль"}
        >
          <PencilLine size={20} weight="duotone" />
        </button>
      </div>

      {editing && (
        <div className="profile-edit-area">
          <div className="profile-avatar-actions">
            <button
              type="button"
              className="profile-action"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera size={15} weight="bold" />
              Выбрать фото
            </button>
            {profile.avatar && (
              <button
                type="button"
                className="profile-action profile-action-muted"
                onClick={() => onProfileChange({ ...profile, avatar: null })}
              >
                <Trash size={15} weight="bold" />
                Удалить фото
              </button>
            )}
            <input
              ref={avatarInputRef}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={changeAvatar}
            />
          </div>

          <label className="profile-name-field">
            <span className="field-label">Никнейм</span>
            <input
              className="field-input"
              value={profile.nickname}
              maxLength={32}
              onChange={(event) =>
                onProfileChange({
                  ...profile,
                  nickname: event.target.value,
                })
              }
              placeholder="Введите никнейм"
            />
            <span className={avatarError ? "field-error" : "field-help"}>
              {avatarError ||
                "До 32 символов. Изменения сохраняются автоматически."}
            </span>
          </label>
        </div>
      )}

      <div className="profile-level">
        <span className="flex items-center gap-2">
          <Fire size={16} weight="fill" />
          Уровень вкуса
        </span>
        <span className="font-mono text-xs">
          LVL {Math.max(1, Math.floor(ranked / 8) + 1)}
        </span>
        <span className="level-track">
          <span
            style={{
              transform: `scaleX(${Math.min(0.92, 0.18 + ranked / 100)})`,
            }}
          />
        </span>
      </div>

      <div className="profile-stats">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="profile-stat">
            <Icon size={19} weight="bold" />
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="profile-insights">
        <div className="profile-insight"><span>Любимый жанр</span><strong>{favoriteGenre}</strong></div>
        <div className="profile-insight"><span>Средний год</span><strong>{averageYear}</strong></div>
        <div className="profile-insight"><span>Разработчик</span><strong>{favoriteDeveloper}</strong></div>
        <div className="profile-insight"><span>Распределено</span><strong>{completion}%</strong></div>
      </div>

      {topGames.length > 0 && (
        <div className="profile-data-block">
          <p className="field-label">Топ игр</p>
          <div className="profile-game-tags">
            {topGames.map((game, index) => <span key={game.id}>{String(index + 1).padStart(2, "0")} · {game.name}</span>)}
          </div>
        </div>
      )}

      {tierCounts.size > 0 && (
        <div className="profile-data-block">
          <p className="field-label">Игры по рангам</p>
          <div className="profile-tier-counts">
            {[...tierCounts.entries()].map(([label, value]) => <span key={label}><strong>{label}</strong>{value}</span>)}
          </div>
        </div>
      )}

      {activity.length > 0 && (
        <div className="profile-data-block">
          <p className="field-label">Последние изменения рейтинга</p>
          <div className="profile-activity">
            {activity.map((item) => (
              <span key={item.id}>
                <strong>{item.gameName}</strong>
                <small>{item.type === "move" ? `${item.from ?? "Каталог"} → ${item.to}` : item.type === "add" ? "Добавлена" : "Удалена"}</small>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="data-transfer">
        <div>
          <p className="field-label">Перенос данных</p>
          <p className="profile-transfer-description">
            Профиль, категории и все сохранённые тир-листы.
          </p>
        </div>
        <div className="data-transfer-actions">
          {onInstall && (
            <button type="button" className="profile-action" onClick={onInstall}>
              <DeviceMobile size={15} weight="bold" />
              Установить
            </button>
          )}
          <button
            type="button"
            className="profile-action"
            onClick={() => {
              onExport();
              setTransferMessage("Файл экспорта сохранён.");
            }}
          >
            <DownloadSimple size={15} weight="bold" />
            Экспорт
          </button>
          <button
            type="button"
            className="profile-action"
            onClick={() => importInputRef.current?.click()}
          >
            <UploadSimple size={15} weight="bold" />
            Импорт
          </button>
          <input
            ref={importInputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={importData}
          />
        </div>
      </div>

      {transferMessage && (
        <p className="transfer-message" role="status">
          {transferMessage}
        </p>
      )}

      <div className="profile-note">
        <span className="status-pulse" />
        <p>
          Данные хранятся только на этом устройстве. Экспорт создаёт локальную
          резервную копию.
        </p>
      </div>
    </Modal>
  );
}
