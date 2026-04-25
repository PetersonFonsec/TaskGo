const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuButton && mainNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      mainNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".premium-section, .testimonials").forEach((section) => {
  const track = section.querySelector("[data-carousel]");
  const items = track ? Array.from(track.children) : [];
  const prev = section.querySelector(".slider-button.prev");
  const next = section.querySelector(".slider-button.next");
  let active = 0;

  const render = () => {
    if (window.matchMedia("(min-width: 821px)").matches) {
      items.forEach((item) => item.removeAttribute("hidden"));
      return;
    }

    items.forEach((item, index) => {
      item.toggleAttribute("hidden", index !== active);
    });
  };

  prev?.addEventListener("click", () => {
    active = (active - 1 + items.length) % items.length;
    render();
  });

  next?.addEventListener("click", () => {
    active = (active + 1) % items.length;
    render();
  });

  window.addEventListener("resize", render);
  render();
});
