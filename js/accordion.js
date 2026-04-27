
// Zwijane sekcje
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".accordion-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const content = button.nextElementSibling;
            content.style.display = content.style.display === "block" ? "none" : "block";
            console.log("📂 Zmieniono sekcję:", button.innerText);
        });
    });
});
