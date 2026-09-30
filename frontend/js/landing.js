(() => {
  const $ = (id) => document.getElementById(id);

  async function readJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function authRequest(endpoint, options = {}) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const payload = await readJson(response).catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Authentication request failed.");
    return payload;
  }

  async function getSession() {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) return null;
      const payload = await readJson(response).catch(() => ({}));
      return payload.user || null;
    } catch {
      return null;
    }
  }

  const authModal = $("authModal");
  const authError = $("authError");
  const authTabs = document.querySelectorAll(".auth-tab");
  const authForms = document.querySelectorAll(".auth-form");

  function openModal(tab) {
    if (!authModal) return;
    authModal.classList.add("open");
    if (tab) {
      authTabs.forEach((item) => item.classList.toggle("active", item.dataset.auth === tab));
      authForms.forEach((form) => form.classList.toggle("active-form", form.id === `${tab}Form`));
    }
    if (authError) authError.style.display = "none";
  }

  function showError(message) {
    if (authError) {
      authError.textContent = message;
      authError.style.display = "block";
    } else if (typeof showToast === "function") {
      showToast(message, "error");
    } else {
      const container = document.getElementById("toastContainer");
      if (container) {
        const toast = document.createElement("div");
        toast.className = "toast toast-error";
        toast.innerHTML = `<span class="toast-icon">!</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add("toast-leaving"); setTimeout(() => toast.remove(), 260); }, 4200);
      }
    }
  }

  function setGuestCtas() {
    const targets = [$("topCta"), $("homeCta")].filter(Boolean);
    targets.forEach((cta) => {
      cta.textContent = "Sign Up";
      cta.href = "#";
      cta.addEventListener("click", (event) => {
        event.preventDefault();
        openModal("signup");
      });
    });
  }

  function setMemberCtas() {
    const targets = [$("topCta"), $("homeCta")].filter(Boolean);
    targets.forEach((cta) => {
      cta.textContent = "Open Dashboard";
      cta.href = "dashboard.html";
    });
  }

  async function handle() {
    document.dispatchEvent(new CustomEvent("candleflow-auth-change"));
    window.location.href = "/dashboard.html";
  }

  function bindTabs() {
    authTabs.forEach((tab) => {
      tab.addEventListener("click", () => openModal(tab.dataset.auth));
    });
  }

  function bindForms() {
    const loginForm = $("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = $("loginEmail").value.trim();
        const password = $("loginPassword").value.trim();
        try {
          await authRequest("login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });
          await handle();
        } catch (error) {
          showError(error.message);
        }
      });
    }

    const signupForm = $("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = $("signupName").value.trim();
        const email = $("signupEmail").value.trim();
        const password = $("signupPassword").value.trim();
        try {
          await authRequest("signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
          });
          await handle();
        } catch (error) {
          showError(error.message);
        }
      });
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "#";
    } catch {
      return "#";
    }
  }

  function formatNewsTime(value) {
    const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderNews(articles) {
    const ticker = document.getElementById("landingNewsTrack");
    const grid = document.getElementById("landingNewsGrid");
    const items = articles.slice(0, 9).map((article) => ({
      title: article.headline || article.title || "Untitled",
      source: article.source || article.publisher || "Market",
      url: article.url || "#",
      time: article.datetime || article.published || article.pubDate || ""
    }));

    if (ticker) {
      const line = items.map((item) => item.title).join("   ·   ");
      ticker.textContent = `${line}   ·   ${line}`;
    }

    if (grid) {
      grid.innerHTML = items.slice(0, 6).map((item) => `
        <a class="news-card" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">
          <span class="news-source">${escapeHtml(item.source)}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <time class="news-date">${escapeHtml(formatNewsTime(item.time))}</time>
        </a>
      `).join("");
    }
  }

  function showNewsMessage(message) {
    const ticker = document.getElementById("landingNewsTrack");
    const grid = document.getElementById("landingNewsGrid");
    if (ticker) ticker.textContent = message;
    if (grid) grid.innerHTML = `<p class="error-banner">${escapeHtml(message)}</p>`;
  }

  async function loadFromServer() {
    const response = await fetch("/api/news");
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "Server news request failed.");
    return data.articles || data.news || [];
  }

async function loadNews() {
  try {
    const articles = await loadFromServer();

    if (!Array.isArray(articles) || articles.length === 0) {
      showNewsMessage("No headlines available right now.");
      return;
    }

    renderNews(articles);
  } catch (error) {
    console.error("News API failed:", error);
    showNewsMessage("Unable to load headlines.");
  }
}

  async function init() {
    bindTabs();
    bindForms();
    updateHeroConnection();
    window.addEventListener("online", updateHeroConnection);
    window.addEventListener("offline", updateHeroConnection);

    const user = await getSession();
    const params = new URLSearchParams(location.search);
    if (user) {
      setMemberCtas();
    } else {
      setGuestCtas();
      if (params.get("signup") === "required") openModal("signup");
    }

    loadNews();
    setInterval(loadNews, 10 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
