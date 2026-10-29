
export default async () => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  };

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  const bases = [
    "https://external-api.kalshi.com/trade-api/v2",
    "https://api.elections.kalshi.com/trade-api/v2"
  ];

  let lastError = "No Kalshi endpoint responded";

  for (const base of bases) {
    try {
      const response = await fetch(
        `${base}/markets?series_ticker=KXBTC15M&status=open&limit=100`
      );

      if (!response.ok) {
        throw new Error(`Markets HTTP ${response.status}`);
      }

      const data = await response.json();
      const now = Date.now();

      const markets = (data.markets || [])
        .filter(m => m.ticker && m.close_time)
        .sort(
          (a, b) =>
            Date.parse(a.close_time) - Date.parse(b.close_time)
        );

      const market = markets.find(
        m => Date.parse(m.close_time) > now
      );

      if (!market) {
        throw new Error("No active BTC 15-minute market found");
      }

      const bookResponse = await fetch(
        `${base}/markets/${encodeURIComponent(market.ticker)}/orderbook`
      );

      if (!bookResponse.ok) {
        throw new Error(`Order book HTTP ${bookResponse.status}`);
      }

      const bookData = await bookResponse.json();

      return json({
        market: {
          ticker: market.ticker,
          status: market.status,
          close_time: market.close_time,
          floor_strike: market.floor_strike,
          strike: market.strike,
          subtitle: market.subtitle,
          title: market.title
        },
        orderbook:
          bookData.orderbook_fp ||
          bookData.orderbook ||
          bookData
      });
    } catch (error) {
      lastError = error.message || String(error);
    }
  }

  return json({
    error: `Kalshi request failed: ${lastError}`
  }, 502);
};

export const config = {
  path: "/.netlify/functions/kalshi"
};
