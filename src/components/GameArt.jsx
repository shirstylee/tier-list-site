export default function GameArt({
  game,
  className = "",
  eager = false,
  children,
}) {
  return (
    <div className={`game-art ${className}`}>
      {game.background_image ? (
        <img
          src={game.background_image}
          alt=""
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="game-art-fallback" aria-hidden="true">
          {game.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 3)}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
      {children}
    </div>
  );
}
