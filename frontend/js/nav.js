(() => {
  const adminLink = ["Admin", "admin.html"];
  const links = [
    ["Home", "index.html"], ["Dashboard", "dashboard.html"], ["Markets", "markets.html"],
    ["Portfolio", "portfolio.html"], ["Trades", "trades.html"],
    ["Learn", "learn.html"],
    ["Contact", "contact.html"], ["About", "about.html"], ["FAQ", "faq.html"], ["Settings", "settings.html"]
  ];
  const guestLinks = [["Home", "index.html"]];
  const currentPage = location.pathname.split("/").pop() || "index.html";

  async function readJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function getSession() {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) return { user: null, admin: false };
      const data = await readJson(response).catch(() => ({}));
      const user = data.user || null;
      return { user, admin: Boolean(user && user.role === "Admin") };
    } catch {
      return { user: null, admin: false };
    }
  }

  function renderLinks(session) {
    const navMenu = document.querySelector(".nav-menu");
    if (!navMenu) return;
    const visible = session.user ? (session.admin ? [...links, adminLink] : links) : guestLinks;
    navMenu.innerHTML = visible.map(([label, href]) =>
      `<a class="nav-item ${href === currentPage ? "active" : ""}" href="${href}">${label}</a>`
    ).join("");
  }

  async function initNav() {
    const session = await getSession();
    renderLinks(session);
    const navMenu = document.querySelector(".nav-menu");
    if (navMenu) navMenu.style.display = "flex";
  }

  document.addEventListener("candleflow-auth-change", async () => {
    const navMenu = document.querySelector(".nav-menu");
    if (!navMenu) return;
    const session = await getSession();
    renderLinks(session);
  });

  const toggle = document.createElement("button");
  toggle.className = "sidebar-toggle";
  toggle.setAttribute("aria-label", "Toggle navigation");
  toggle.innerHTML = "&#9776;";

  const close = document.createElement("button");
  close.className = "sidebar-close";
  close.setAttribute("aria-label", "Close navigation");
  close.innerHTML = "&#10005;";

  const toggleSidebar = () => document.body.classList.toggle("sidebar-open");
  toggle.addEventListener("click", toggleSidebar);
  close.addEventListener("click", toggleSidebar);
  document.body.addEventListener("click", (e) => {
    if (document.body.classList.contains("sidebar-open") &&
        !e.target.closest(".shared-sidebar, .sidebar-toggle")) {
      document.body.classList.remove("sidebar-open");
    }
  });

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar shared-sidebar";
  sidebar.innerHTML = `<a class="brand-lockup" href="index.html" aria-label="Candleflow home"><img src="assets/candleflow-logo.svg" alt="Candleflow"></a><nav class="nav-menu" aria-label="Primary navigation" style="display:none"></nav><div class="sidebar-card"><p>Market Pulse</p><strong id="sidebarPulse">—</strong><span id="sidebarStatus">Connecting…</span></div>`;
  sidebar.prepend(close);

  document.body.prepend(toggle);
  document.body.prepend(sidebar);
  document.body.classList.add("has-shared-sidebar");

  const scrollTop = document.createElement("button");
  scrollTop.className = "scroll-top-btn";
  scrollTop.setAttribute("aria-label", "Scroll to top");
  scrollTop.innerHTML = "&#8593;";
  scrollTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(scrollTop);

  window.addEventListener("scroll", () => {
    scrollTop.classList.toggle("visible", window.scrollY > 480);
  }, { passive: true });

  function ensureToastContainer() {
    if (document.getElementById("toastContainer")) return;
    const toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    toastContainer.id = "toastContainer";
    document.body.appendChild(toastContainer);
  }

  document.addEventListener("DOMContentLoaded", ensureToastContainer);
  if (document.readyState !== "loading") ensureToastContainer();

  window.showToast = function showGlobalToast(message, type = "info", duration = 4200) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "\u2713" : type === "error" ? "!" : "i";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-leaving");
      setTimeout(() => toast.remove(), 260);
    }, duration);
  };
  window.adminToast = window.showToast;

  async function updateMarketPulse() {
    const pulseEl = document.getElementById("sidebarPulse");
    const statusEl = document.getElementById("sidebarStatus");
    if (!pulseEl || !statusEl) return;
    try {
      const response = await fetch("/api/market/prices?symbols=BTC/USD,ETH/USD");
      const payload = await readJson(response).catch(() => ({}));
      if (response.ok && payload && (payload["BTC/USD"] || payload["ETH/USD"])) {
        pulseEl.textContent = "Live";
        statusEl.textContent = `Connected \u00b7 ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        statusEl.classList.add("status-ok");
      } else {
        pulseEl.textContent = "Sim";
        statusEl.textContent = "Demo market data";
        statusEl.classList.remove("status-ok");
      }
    } catch {
      pulseEl.textContent = "—";
      statusEl.textContent = "Offline";
      statusEl.classList.remove("status-ok");
    }
  }

  updateMarketPulse();
  setInterval(updateMarketPulse, 30000);

  initNav();
})();
