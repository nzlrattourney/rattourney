exports.handler = async function (event) {
  const { name, tag } = event.queryStringParameters || {};

  if (!name || !tag) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing name or tag" }),
    };
  }

  const RIOT_API_KEY = process.env.RIOT_API_KEY;
  if (!RIOT_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Riot API key not configured" }),
    };
  }

  try {
    // Step 1: Get PUUID from name + tag
    const accountRes = await fetch(
      `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: { "X-Riot-Token": RIOT_API_KEY } }
    );

    if (accountRes.status === 404) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Summoner "${name}#${tag}" not found on OCE.` }),
      };
    }

    if (!accountRes.ok) {
      return {
        statusCode: accountRes.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Riot API error (${accountRes.status})` }),
      };
    }

    const { puuid } = await accountRes.json();

    // Step 2: Get rank directly from PUUID
    const rankRes = await fetch(
      `https://oc1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
      { headers: { "X-Riot-Token": RIOT_API_KEY } }
    );

    let rank = "Unranked";
    if (rankRes.ok) {
      const entries = await rankRes.json();
      console.log("Rank entries:", JSON.stringify(entries));
      const solo = entries.find(e => e.queueType === "RANKED_SOLO_5x5");
      rank = solo ? `${solo.tier} ${solo.rank}` : "Unranked";
    } else {
      console.log("Rank fetch failed:", rankRes.status);
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ rank, summoner: `${name}#${tag}` }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Server error: " + err.message }),
    };
  }
};