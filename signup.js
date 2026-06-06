const CONFIG = {
  // netlifyUrl: "http://localhost:8888",
  netlifyUrl: "https://rat-tourney.netlify.app",
};

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

function isAlreadyRegistered() {
  const expiry = localStorage.getItem("registered_until");
  if (!expiry) return false;
  if (Date.now() < parseInt(expiry)) return true;
  localStorage.removeItem("registered_until"); // expired, clean up
  return false;
}

function setRegisteredLock() {
  const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem("registered_until", sevenDays.toString());
}

// ── Form submission ───────────────────────────────────────────

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

      if (isAlreadyRegistered()) {
    setStatus("error", "You have already registered for this tournament.");
    return;
  }
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

const validDiscord = /^.{2,32}#\d{4}$/.test(discord) || /^@?[a-z0-9_.]{2,32}$/i.test(discord);;
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
    setRegisteredLock(); 
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
    padding: 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-family: 'Orbitron', sans-serif;
    text-align: center;
    letter-spacing: 0.5px;
    ${
      type === "error"
        ? "background:rgba(255,50,50,0.1);border:1px solid rgba(255,50,50,0.5);color:#ff6b6b;box-shadow:0 0 10px rgba(255,50,50,0.2);"
        : type === "success"
        ? "background:rgba(86,221,221,0.1);border:1px solid rgba(86,221,221,0.5);color:#56dddd;box-shadow:0 0 10px rgba(86,221,221,0.2);"
        : "background:rgba(145,70,255,0.1);border:1px solid rgba(145,70,255,0.4);color:#c9a3ff;box-shadow:0 0 10px rgba(145,70,255,0.2);"
    }
  `;
  document.getElementById("signupForm").appendChild(box);
}

function clearStatus() {
  const existing = document.getElementById("signup-status");
  if (existing) existing.remove();
}