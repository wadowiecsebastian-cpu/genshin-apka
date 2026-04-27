document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("character-grid");
  if (!grid || !window.characterData) return;

  Object.entries(characterData).forEach(([name, data]) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.name = name;

    const img = document.createElement("img");
    img.src = `Portrety/${name}.png`;
    img.alt = name;

    const title = document.createElement("h3");
    title.textContent = name;

    card.appendChild(img);
    card.appendChild(title);

    card.addEventListener("click", () => {
      window.location.href = `character.html?character=${encodeURIComponent(name)}`;
    });

    grid.appendChild(card);
  });

  console.log("📦 Załadowano postacie:", Object.keys(characterData).length);
});