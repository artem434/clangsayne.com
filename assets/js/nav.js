(function () {
  var burger = document.getElementById("burger");
  var menu = document.querySelector("nav .menu");
  if (!burger || !menu) return;
  burger.addEventListener("click", function () {
    var on = menu.classList.toggle("menuon");
    burger.setAttribute("aria-expanded", on ? "true" : "false");
  });
})();
