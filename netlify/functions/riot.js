exports.handler = async function (event) {
  const { name, tag } = event.queryStringParameters || {};

  if (!name || !tag) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing name or tag" }),
    };
  }

  try {
    const url = `https://www.leagueofgraphs.com/summoner/oce/${encodeURIComponent(name)}-${encodeURIComponent(tag)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Failed to fetch summoner page" }),
      };
    }

    const html = await response.text();

    // Check summoner exists
    const notFound = html.includes("Summoner not found") || !html.includes("bg-black");
    if (notFound) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Summoner "${name}#${tag}" not found on OCE.` }),
      };
    }

    // Parse rank
    const tierMatch = html.match(/class="leagueTier[^"]*"[^>]*>\s*([^<]+)\s*</);
    const divisionMatch = html.match(/class="rank[^"]*"[^>]*>\s*([^<]+)\s*</);

    const tier = tierMatch ? tierMatch[1].trim() : null;
    const division = divisionMatch ? divisionMatch[1].trim() : null;
    const rank = tier ? `${tier}${division ? " " + division : ""}`.trim() : "Unranked";

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