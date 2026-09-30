(() => {
  var container = document.getElementById("toastContainer");

  function showToast(message, type) {
    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    var icon = type === "error" ? "!" : type === "success" ? "\u2713" : "i";
    toast.innerHTML = '<span class="toast-icon">' + icon + "</span><span>" + message + "</span>";
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add("toast-leaving"); setTimeout(function() { toast.remove(); }, 260); }, 4200);
  }

  async function readJson(response) {
    var text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function loadProfile() {
    try {
      var response = await fetch("/api/auth/me", { credentials: "same-origin" });
      var data = await readJson(response);
      if (!data.user) {
        window.location.href = "/?signup=required";
        return;
      }
      document.getElementById("settingsName").value = data.user.name || "";
      document.getElementById("settingsEmail").value = data.user.email || "";
      document.getElementById("settingsRole").value = data.user.role || "";
      document.getElementById("settingsJoined").value = data.user.created || "";
    } catch {
      showToast("Failed to load profile.", "error");
    }
  }

  document.getElementById("saveSettings").addEventListener("click", async function() {
    var name = document.getElementById("settingsName").value.trim();
    if (!name) {
      showToast("Display name cannot be empty.", "error");
      return;
    }
    var button = document.getElementById("saveSettings");
    button.disabled = true;
    button.textContent = "Saving\u2026";
    try {
      var response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name })
      });
      var data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "Could not save changes.");
      document.getElementById("settingsName").value = data.user.name || name;
      document.getElementById("settingsJoined").value = data.user.created || "";
      showToast("Profile updated successfully.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save Changes";
    }
  });

  document.getElementById("signOutAll").addEventListener("click", async function() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "/";
    } catch {
      showToast("Failed to sign out.", "error");
    }
  });

  loadProfile();
})();