(() => {
  var form = document.getElementById("contactForm");
  var submitBtn = document.getElementById("contactSubmit");
  var success = document.getElementById("contactSuccess");
  var container = document.getElementById("toastContainer");

  function showToast(message, type) {
    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    var icon = type === "error" ? "!" : type === "success" ? "\u2713" : "i";
    toast.innerHTML = '<span class="toast-icon">' + icon + "</span><span>" + message + "</span>";
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add("toast-leaving"); setTimeout(function() { toast.remove(); }, 260); }, 4200);
  }

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    var name = document.getElementById("contactName").value.trim();
    var email = document.getElementById("contactEmail").value.trim();
    var message = document.getElementById("contactMessage").value.trim();
    if (!name || !email || !message) {
      showToast("Please fill in all fields.", "error");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending\u2026";
    try {
      var response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, message: message })
      });
      var text = await response.text();
      var payload = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(payload.error || "Could not send your message.");
      form.style.display = "none";
      success.style.display = "block";
      showToast("Message sent successfully!", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
})();