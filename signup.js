// ============================================================
// CONFIG — fill these in before deploying
// ============================================================
const CONFIG = {
  githubToken: "YOUR_GITHUB_TOKEN",

  githubRepo: "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME",

  githubFile: "registrations.csv",

  netlifyUrl: "https://rat-tourney.netlify.app/",
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

// ── Form submission ───────────────────────────────────────────

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const ign = form.ign.value.trim();
  const discord = form.discord.value.trim();

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
    setStatus("info", "Looking up summoner...");

    const proxyRes = await fetch(
      `${CONFIG.netlifyUrl}/.netlify/functions/riot?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`
    );

    if (proxyRes.status === 404) {
      throw new Error(`Summoner "${ign}" not found on OCE. Check your name and tag.`);
    }
    if (!proxyRes.ok) {
      throw new Error("Could not validate summoner. Try again later.");
    }

    const data = await proxyRes.json();
    rank = data.rank;

    setStatus("info", "Saving registration...");

    const { existingContent, sha } = await githubReadFile();

    const alreadyRegistered = existingContent
      .split("\n")
      .slice(1) 
      .some((line) => {
        const [savedIgn] = line.split(",");
        return savedIgn && savedIgn.toLowerCase() === ign.toLowerCase();
      });

    if (alreadyRegistered) {
      throw new Error(`"${ign}" is already registered!`);
    }

    const header = existingContent === "" ? "IGN,Discord,Rank\n" : "";
    const newLine = `${ign},${discord},${rank}\n`;
    await githubWriteFile(header + existingContent + newLine, sha);

    // ── Success ────────────────────────────────────────────────
    setStatus("success", `✔ Registered! IGN: ${ign} | Rank: ${rank}`);
    form.reset();
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});


async function githubReadFile() {
  const res = await fetch(
    `https://api.github.com/repos/${CONFIG.githubRepo}/contents/${CONFIG.githubFile}`,
    {
      headers: {
        Authorization: `Bearer ${CONFIG.githubToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (res.status === 404) {
    return { existingContent: "", sha: null };
  }
  if (!res.ok) {
    throw new Error(`GitHub read error (${res.status}). Check your token and repo name.`);
  }

  const data = await res.json();
  const existingContent = decodeURIComponent(
    escape(atob(data.content.replace(/\n/g, "")))
  );
  return { existingContent, sha: data.sha };
}

async function githubWriteFile(content, sha) {
  const body = {
    message: "Add tournament registration",
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${CONFIG.githubRepo}/contents/${CONFIG.githubFile}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${CONFIG.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub write error (${res.status}).`);
  }
}


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