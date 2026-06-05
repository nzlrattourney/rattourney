exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_FILE = process.env.GITHUB_FILE || "registrations.csv";

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "GitHub not configured" }),
    };
  }

  const { ign, discord, rank } = JSON.parse(event.body);

  if (!ign || !discord) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing fields" }),
    };
  }

  try {
    // Read existing file
    const readRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    let existingContent = "";
    let sha = null;

    if (readRes.status === 404) {
      existingContent = "";
    } else if (readRes.ok) {
      const data = await readRes.json();
      existingContent = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      sha = data.sha;
    } else {
      throw new Error(`GitHub read error (${readRes.status})`);
    }

    // Duplicate check
    const alreadyRegistered = existingContent
      .split("\n")
      .slice(1)
      .some((line) => {
        const [savedIgn] = line.split(",");
        return savedIgn && savedIgn.toLowerCase() === ign.toLowerCase();
      });

    if (alreadyRegistered) {
      return {
        statusCode: 409,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `"${ign}" is already registered!` }),
      };
    }

    const header = existingContent === "" ? "IGN,Discord,Rank\n" : "";
    const newLine = `${ign},${discord},${rank}\n`;
    const newContent = header + existingContent + newLine;

    const writeBody = {
      message: "Add tournament registration",
      content: btoa(unescape(encodeURIComponent(newContent))),
    };
    if (sha) writeBody.sha = sha;

    const writeRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(writeBody),
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub write error (${writeRes.status})`);
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};