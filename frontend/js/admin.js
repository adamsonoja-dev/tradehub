(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    overview: null,
    activity: [],
    filter: "all"
  };

  const TYPE_META = {
    signup: { label: "Signup", class: "type-signup" },
    login: { label: "Login", class: "type-login" },
    logout: { label: "Logout", class: "type-logout" },
    deposit: { label: "Deposit", class: "type-deposit" },
    withdrawal: { label: "Withdrawal", class: "type-withdrawal" },
    trade: { label: "Trade", class: "type-trade" }
  };

  function timeAgo(iso) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtMoney(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
  }

  function statCard(label, value, accent) {
    return `<article class="card admin-stat-card ${accent || ""}"><p>${label}</p><h2>${value}</h2></article>`;
  }

  function renderStatCards() {
    const container = $("adminStatCards");
    if (!container || !state.overview) return;
    const { activity } = state.overview;
    container.innerHTML = [
      statCard("Total Users", state.overview.totalAccounts || 0, "accent-primary"),
      statCard("New Signups", activity?.totalSignups || 0, "accent-primary"),
      statCard("Logins", activity?.totalLogins || 0, "accent-secondary"),
      statCard("Deposits", activity?.deposits || 0, "accent-amber"),
      statCard("Withdrawals", activity?.withdrawals || 0, "accent-coral"),
      statCard("Trades Placed", activity?.trades || 0, "accent-secondary")
    ].join("");
  }

  function renderActivity() {
    const body = $("activityBody");
    const empty = $("activityEmpty");
    const countLabel = $("activityCountLabel");
    if (!body || !state.activity) return;

    const list = state.activity;
    body.innerHTML = list.map((entry) => {
      const meta = TYPE_META[entry.type] || { label: entry.type, class: "type-default" };
      return `<tr>
        <td class="activity-time">${timeAgo(entry.timestamp)}</td>
        <td><span class="event-badge ${meta.class}">${meta.label}</span></td>
        <td><strong>${escapeHtml(entry.name || "—")}</strong><span class="activity-email">${escapeHtml(entry.email || "")}</span></td>
        <td>${escapeHtml(entry.detail || "")}</td>
      </tr>`;
    }).join("");

    if (countLabel) countLabel.textContent = `${list.length} event${list.length === 1 ? "" : "s"}`;
    if (empty) empty.style.display = list.length ? "none" : "block";
  }

  function renderUsers() {
    const body = $("usersBody");
    const empty = $("usersEmpty");
    const countLabel = $("userCountLabel");
    if (!body || !state.overview) return;

    const users = state.overview.accounts || [];
    body.innerHTML = users.map((user) => {
      const roleBadge = user.role === "Admin" ? "role-admin" : "role-trader";
      return `<tr>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="event-badge ${roleBadge}">${escapeHtml(user.role)}</span></td>
        <td>${escapeHtml(user.created || "—")}</td>
        <td><span class="status-dot online"></span> Active</td>
      </tr>`;
    }).join("");

    if (countLabel) countLabel.textContent = `${users.length} account${users.length === 1 ? "" : "s"}`;
    if (empty) empty.style.display = users.length ? "none" : "block";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  async function readJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function loadOverview() {
    const response = await fetch("/api/admin/overview");
    const payload = await readJson(response).catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load the admin dashboard.");
    }
    state.overview = payload;
    renderStatCards();
    renderUsers();
    if (state.filter === "all") {
      state.activity = state.overview.recentActivity || [];
    }
    renderActivity();
  }

  async function loadActivity() {
    const type = state.filter;
    const url = type === "all" ? "/api/admin/activity?limit=200" : `/api/admin/activity?type=${encodeURIComponent(type)}&limit=200`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load activity.");
    const data = await readJson(response).catch(() => ({}));
    state.activity = data.activity || [];
    renderActivity();
  }

  function bindFilters() {
    const container = $("adminFilterTabs");
    if (!container) return;
    container.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        container.querySelectorAll(".filter-btn").forEach((item) => item.classList.toggle("active", item === button));
        state.filter = button.dataset.type;
        try {
          await loadActivity();
        } catch (error) {
          if (window.adminToast) window.adminToast(error.message);
        }
      });
    });
  }

  async function init() {
    try {
      await loadOverview();
      bindFilters();
    } catch (error) {
      window.location.href = "/dashboard.html?admin=required";
      return;
    }
    const poll = setInterval(async () => {
      try {
        await loadOverview();
        if (state.filter !== "all") await loadActivity();
      } catch { clearInterval(poll); }
    }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
