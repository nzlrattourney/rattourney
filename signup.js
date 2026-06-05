// ============================================================
// CONFIG — no secrets here, all stored in Netlify env vars
// ============================================================
const CONFIG = {
  // netlifyUrl: "http://localhost:8888",
  netlifyUrl: "https://rat-tourney.netlify.app",
};
// ============================================================

const signupModal = document.getElementById("signupModal");
const signupOpenBtn = document.getElementById("register");
const signupCloseBtn = document.querySelector(".close");

signupOpenBtn.onclick = () => (signupModal.style.display = "block");
signupCloseBtn.onclick = () => closeSignupModal();
window.onclick = (e) => { if (e.target === signupModal) closeSignupModal(); };

function closeSignupModal() {
  signupModal.style.display = "none";
  clearStatus();
}


const RATE_LIMIT = {
  maxAttempts: 5,        
  windowMs: 60 * 1000,  
};

function checkRateLimit() {
  const now = Date.now();
  const stored = JSON.parse(localStorage.getItem("signup_attempts") || "[]");

  // Filter out attempts outside the window
  const recent = stored.filter(t => now - t < RATE_LIMIT.windowMs);

  if (recent.length >= RATE_LIMIT.maxAttempts) {
    const oldest = recent[0];
    const secondsLeft = Math.ceil((RATE_LIMIT.windowMs - (now - oldest)) / 1000);
    return { blocked: true, secondsLeft };
  }

  recent.push(now);
  localStorage.setItem("signup_attempts", JSON.stringify(recent));
  return { blocked: false };
}

// ── Form submission ───────────────────────────────────────────

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const ign = form.ign.value.trim();
  const discord = form.discord.value.trim();

  // Rate limit check
  const { blocked, secondsLeft } = checkRateLimit();
  if (blocked) {
    setStatus("error", `Too many attempts. Please wait ${secondsLeft} seconds before trying again.`);
    return;
  }

  if (!ign || !discord) {
    setStatus("error", "Please fill in both fields.");
    return;
  }

  const validDiscord = /^.{2,32}#\d{4}$/.test(discord) || /^@[a-z0-9_]{2,32}$/.test(discord);
  if (!validDiscord) {
    setStatus("error", "Invalid Discord name format. Use @username or name#1234");
    return;
  }

  if (!ign.includes("#")) {
    setStatus("error", "Please include your tag, e.g. PlayerName#OCE1");
    return;
  }

  const submitBtn = form.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Checking...";

  try {
    let rank = "Unranked";
    const [name, tag] = ign.split("#");

    //Validate summoner + get rank via Netlify ──────
    setStatus("info", "Looking up summoner...");

    const riotRes = await fetch(
      `${CONFIG.netlifyUrl}/.netlify/functions/riot?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`
    );

    if (riotRes.status === 404) {
      throw new Error(`Summoner "${ign}" not found on OCE. Check your name and tag.`);
    }
    if (!riotRes.ok) {
      throw new Error("Could not validate summoner. Try again later.");
    }

    const riotData = await riotRes.json();
    rank = riotData.rank;

    // Save registration via Netlify ─────────────────
    setStatus("info", "Saving registration...");

    const registerRes = await fetch(
      `${CONFIG.netlifyUrl}/.netlify/functions/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ign, discord, rank }),
      }
    );

    const registerData = await registerRes.json();

    if (registerRes.status === 409) {
      throw new Error(registerData.error);
    }
    if (!registerRes.ok) {
      throw new Error(registerData.error || "Failed to save registration.");
    }

    // ── Success ───────────────────────────────────────────────
    setStatus("success", `✔ Registered! IGN: ${ign} | Rank: ${rank}`);
    form.reset();
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});


function setStatus(type, message) {
  clearStatus();
  const box = document.createElement("p");
  box.id = "signup-status";
  box.textContent = message;
  box.style.cssText = `
    margin: 12px 0 0;
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'Orbitron', sans-serif;
    ${
      type === "error"
        ? "background:#1a0510;border:1px solid #9b30ff66;color:#cc44ff;"
        : type === "success"
        ? "background:#051a0a;border:1px solid #27ae6066;color:#2ecc71;"
        : "background:#0a0a1a;border:1px solid #9146ff44;color:#9b8fd4;"
        }
  `;
  document.getElementById("signupForm").appendChild(box);
}

function clearStatus() {
  const existing = document.getElementById("signup-status");
  if (existing) existing.remove();
}