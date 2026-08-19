function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
}

async function loadImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function drawCover(context, image, x, y, width, height) {
  if (!image) {
    context.fillStyle = "#17191d";
    roundedRect(context, x, y, width, height, 12);
    context.fill();
    return;
  }

  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.save();
  roundedRect(context, x, y, width, height, 12);
  context.clip();
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
  context.restore();
}

export async function exportTierListPng(list) {
  const width = 1600;
  const padding = 64;
  const labelWidth = 190;
  const cardWidth = 218;
  const cardHeight = 122;
  const gap = 12;
  const contentWidth = width - padding * 2 - labelWidth - 24;
  const columns = Math.max(1, Math.floor((contentWidth + gap) / (cardWidth + gap)));
  const rows = [...list.tiers, ...(list.unranked?.length
    ? [{ id: "unranked", label: "Без ранга", color: "#25272c", games: list.unranked }]
    : [])];
  const rowHeights = rows.map((tier) =>
    Math.max(146, Math.ceil(Math.max(1, tier.games.length) / columns) * (cardHeight + gap) + 24),
  );
  const height = 190 + rowHeights.reduce((sum, value) => sum + value + 12, 0) + 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.font = "800 54px Inter, sans-serif";
  context.fillText(list.title || "Без названия", padding, 92, width - padding * 2);
  context.fillStyle = "#6f9eea";
  context.font = "600 18px Inter, sans-serif";
  context.fillText("TIER LIST", padding, 132);

  const games = rows.flatMap((tier) => tier.games);
  const uniqueGames = [...new Map(games.map((game) => [String(game.id), game])).values()];
  const imageEntries = await Promise.all(
    uniqueGames.map(async (game) => [String(game.id), await loadImage(game.background_image)]),
  );
  const images = new Map(imageEntries);

  let currentY = 168;
  rows.forEach((tier, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    context.fillStyle = tier.color;
    roundedRect(context, padding, currentY, labelWidth, rowHeight, 16);
    context.fill();
    context.fillStyle = tier.id === "unranked" ? "#ffffff" : "#080808";
    context.font = "800 25px Inter, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(tier.label, padding + labelWidth / 2, currentY + rowHeight / 2, labelWidth - 24);

    context.fillStyle = "#0d0e10";
    roundedRect(context, padding + labelWidth + 12, currentY, contentWidth + 12, rowHeight, 16);
    context.fill();

    tier.games.forEach((game, gameIndex) => {
      const column = gameIndex % columns;
      const row = Math.floor(gameIndex / columns);
      const x = padding + labelWidth + 24 + column * (cardWidth + gap);
      const y = currentY + 12 + row * (cardHeight + gap);
      drawCover(context, images.get(String(game.id)), x, y, cardWidth, cardHeight);
      context.fillStyle = "rgba(0, 0, 0, 0.82)";
      context.fillRect(x, y + cardHeight - 31, cardWidth, 31);
      context.fillStyle = "#ffffff";
      context.font = "600 14px Inter, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(game.name, x + 10, y + cardHeight - 15, cardWidth - 20);
    });

    currentY += rowHeight + 12;
  });

  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.font = "500 15px Inter, sans-serif";
  context.textAlign = "right";
  context.fillText("Создано в TIER LIST", width - padding, height - 34);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.94));
  if (!blob) throw new Error("Не удалось создать изображение.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tierlist-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
