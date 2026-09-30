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

  async function readJson(response) {
    var text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function closeTrade(id) {
    try {
      var response = await fetch("/api/trades/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo", id: id })
      });
      var payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not close trade.");
      showToast("Position closed. " + fmt(payload.closedPl) + " P/L.", payload.closedPl >= 0 ? "success" : "info");
      loadTrades();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function loadTrades() {
    try {
      var response = await fetch("/api/account", { credentials: "same-origin" });
      if (!response.ok) {
        document.getElementById("openTradesBody").innerHTML = '<tr class="empty-row"><td colspan="8">Sign in through the Dashboard to view your trades.</td></tr>';
        return;
      }
      var data = await readJson(response);
      var account = data.account || {};
      var openTrades = account.trades || [];
      var closedTrades = account.tradesClosed || [];

      var totalWins = 0;
      var netPnl = 0;
      closedTrades.forEach(function(t) {
        if ((t.closedPl || 0) > 0) totalWins++;
        netPnl += t.closedPl || 0;
      });

      document.getElementById("totalTrades").textContent = closedTrades.length;
      document.getElementById("winTrades").textContent = totalWins;
      var pnlEl = document.getElementById("netPnL");
      pnlEl.textContent = fmt(netPnl);
      pnlEl.className = netPnl >= 0 ? "profit" : "loss";

      if (openTrades.length > 0) {
        document.getElementById("openTradesBody").innerHTML = openTrades.map(function(t) {
          var pnlClass = (t.pl || 0) >= 0 ? "profit" : "loss";
          var sign = (t.pl || 0) >= 0 ? "+" : "-";
          return "<tr><td>" + new Date(t.created).toLocaleDateString() + "</td><td>" + escapeHtml(t.market || "") + '</td><td class="' + (t.type === "BUY" ? "buy" : "sell") + '">' + escapeHtml(t.type || "") + "</td><td>" + escapeHtml(t.lotSize) + "</td><td>" + fmt(t.entryPrice) + "</td><td>" + fmt(t.currentPrice) + '</td><td class="' + pnlClass + '">' + sign + fmt(Math.abs(t.pl || 0)) + '</td><td><button class="close-position-btn" data-close="' + escapeHtml(t.id) + '" type="button">Close</button></td></tr>';
        }).join("");
        document.querySelectorAll("[data-close]").forEach(function(button) {
          button.addEventListener("click", function() { closeTrade(button.dataset.close); });
        });
      } else {
        document.getElementById("openTradesBody").innerHTML = '<tr class="empty-row"><td colspan="8">No open positions.</td></tr>';
      }

      if (closedTrades.length > 0) {
        document.getElementById("closedTradesBody").innerHTML = closedTrades.map(function(t) {
          var plClass = (t.closedPl || 0) >= 0 ? "profit" : "loss";
          var sign = (t.closedPl || 0) >= 0 ? "+" : "-";
          return "<tr><td>" + new Date(t.closedAt || t.created).toLocaleDateString() + "</td><td>" + escapeHtml(t.market || "") + '</td><td class="' + (t.type === "BUY" ? "buy" : "sell") + '">' + escapeHtml(t.type || "") + "</td><td>" + escapeHtml(t.lotSize) + "</td><td>" + fmt(t.entryPrice) + "</td><td>" + fmt(t.currentPrice) + '</td><td class="' + plClass + '">' + sign + fmt(Math.abs(t.closedPl || 0)) + "</td></tr>";
        }).join("");
      }
    } catch {
      showToast("Failed to load trade data.", "error");
    }
  }

  loadTrades();
})();