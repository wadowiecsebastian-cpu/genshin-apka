
// Przykład zapisu ustawień
document.addEventListener("DOMContentLoaded", async () => {
    const inputs = document.querySelectorAll("input, select");
    inputs.forEach(async (input) => {
        const key = "setting_" + input.name;
        const saved = (window.IDB && IDB.kvGet) ? await IDB.kvGet(key) : null;
        if (saved) input.value = saved;

        input.addEventListener("change", async () => {
            if (window.IDB && IDB.kvSet) await IDB.kvSet(key, input.value);
            console.log("💾 Zapisano:", key, input.value);
        });
    });
});
