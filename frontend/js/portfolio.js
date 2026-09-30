(() => {
  function showToast(message, type) {
    var container = document.getElementById("toastContainer");
    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    var icon = type === "error" ? "!" : type === "success" ? "\u2713" : "i";
    toast.innerHTML = '<span class="toast-icon">' + icon + "</span><span>" + message + "</span>";
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add("toast-leaving"); setTimeout(function() { toast.remove(); }, 260); }, 4200);
  }

  function fmt(n) { return "$" + Number(n || 0).toFixed(2); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  async function loadPortfolio() {
    try {
      var response = await fetch("/api/account", { credentials: "same-origin" });
      if (!response.ok) {
        document.getElementById("transactionsBody").innerHTML = '<tr class="empty-row"><td colspan="4">Sign in through the Dashboard to view your portfolio.</td></tr>';
        return;
      }
      var data = await response.json();
      var account = data.account || {};

      document.getElementById("portfolioValue").textContent = fmt(account.balance);
      document.getElementById("balanceValue").textContent = fmt(account.balance);

      var transactions = account.transactions || [];
      var totalDeposited = 0;
      var totalWithdrawn = 0;
      transactions.forEach(function(t) {
        if (t.type === "deposit") totalDeposited += t.amount;
        else totalWithdrawn += t.amount;
      });
      document.getElementById("totalDeposited").textContent = fmt(totalDeposited);
      document.getElementById("totalWithdrawn").textContent = fmt(totalWithdrawn);

      var openTrades = account.trades || [];
      document.getElementById("portfolioPositions").textContent = openTrades.length;

      var closedTrades = account.tradesClosed || [];
      var netRealised = 0;
      closedTrades.forEach(function(t) { netRealised += t.closedPl || 0; });
      var changeEl = document.getElementById("portfolioChange");
      changeEl.textContent = (netRealised >= 0 ? "+" : "-") + fmt(Math.abs(netRealised));
      changeEl.className = netRealised >= 0 ? "profit" : "loss";

      if (closedTrades.length > 0) {
        document.getElementById("closedTradesBody").innerHTML = closedTrades.map(function(t) {
          var plClass = (t.closedPl || 0) >= 0 ? "profit" : "loss";
          var sign = (t.closedPl || 0) >= 0 ? "+" : "-";
          return "<tr><td>" + new Date(t.closedAt || t.created).toLocaleDateString() + "</td><td>" + escapeHtml(t.market || "") + '</td><td class="' + (t.type === "BUY" ? "buy" : "sell") + '">' + escapeHtml(t.type || "") + "</td><td>" + escapeHtml(t.lotSize) + "</td><td>" + fmt(t.entryPrice) + "</td><td>" + fmt(t.currentPrice) + '</td><td class="' + plClass + '">' + sign + fmt(Math.abs(t.closedPl || 0)) + "</td></tr>";
        }).join("");
      }

      if (transactions.length > 0) {
        document.getElementById("transactionsBody").innerHTML = transactions.map(function(t) {
          return "<tr><td>" + new Date(t.created).toLocaleDateString() + '</td><td class="' + (t.type === "deposit" ? "profit" : "loss") + '">' + escapeHtml(t.type) + "</td><td>" + fmt(t.amount) + "</td><td>Completed</td></tr>";
        }).join("");
      }
    } catch {
      showToast("Failed to load portfolio data.", "error");
    }
  }

  loadPortfolio();
})();