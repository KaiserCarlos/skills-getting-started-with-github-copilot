document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // pequeño helper para evitar XSS al insertar emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear existing options except the placeholder
      Array.from(activitySelect.options)
        .slice(1)
        .forEach((opt) => opt.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Crear lista de participantes (chips) con botón de borrar
        const participantsHtml =
          details.participants && details.participants.length
            ? `<ul class="participants-list">${details.participants
                .map(
                  (p) =>
                    `<li class="participant-item"><span class="participant-email">${escapeHtml(p)}</span><button class="participant-remove" data-activity="${escapeHtml(
                      name
                    )}" data-email="${escapeHtml(p)}" aria-label="Remove participant">&times;</button></li>`
                )
                .join("")}</ul>`
            : `<p class="no-participants">No hay participantes todavía</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach remove handlers for participant delete buttons
        activityCard.querySelectorAll(".participant-remove").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;

            if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(
                  email
                )}`,
                { method: "DELETE" }
              );

              const data = await resp.json();

              if (resp.ok) {
                messageDiv.textContent = data.message || "Unregistered";
                messageDiv.className = "success";
                // Refresh the list to reflect change
                fetchActivities();
              } else {
                messageDiv.textContent = data.detail || "Failed to unregister";
                messageDiv.className = "error";
              }

              messageDiv.classList.remove("hidden");
              setTimeout(() => messageDiv.classList.add("hidden"), 5000);
            } catch (err) {
              console.error("Error unregistering:", err);
              messageDiv.textContent = "Failed to unregister. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Wait for activities to refresh so UI shows the new participant immediately
        await fetchActivities();
        messageDiv.textContent = result.message || `Signed up ${email}`;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
        if (submitBtn) submitBtn.disabled = false;
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      if (submitBtn) submitBtn.disabled = false;
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
