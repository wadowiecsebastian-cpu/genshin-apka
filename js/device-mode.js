function detectDeviceMode() {
  const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const isMobile = isSmallScreen && isTouch;

  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;

  document.body.classList.toggle("is-mobile", isMobile);
  document.body.classList.toggle("is-desktop", !isMobile);

  document.body.classList.toggle("is-portrait", isMobile && isPortrait);
  document.body.classList.toggle("is-landscape", isMobile && isLandscape);
}

document.addEventListener("DOMContentLoaded", detectDeviceMode);
window.addEventListener("resize", detectDeviceMode);
window.addEventListener("orientationchange", detectDeviceMode);
