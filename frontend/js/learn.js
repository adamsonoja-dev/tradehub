(() => {
  const glossary = [
    ["Pair", "Two assets traded against each other, e.g. BTC/USD is a ratio of Bitcoin's price in US dollars."],
    ["Pip", "The smallest standard price move for a pair. For most pairs it is 0.0001; for JPY pairs it is 0.01."],
    ["Lot", "A standardised trade size. The larger the lot, the more each pip is worth to your position."],
    ["Bid / Ask", "The price buyers are willing to pay (bid) and the price sellers are asking (ask)."],
    ["Spread", "The difference between the ask and bid prices — effectively the cost of entering a trade."],
    ["Long / Short", "Going long means buying expecting the price to rise. Going short means selling expecting it to fall."],
    ["Equity", "Your balance plus or minus any unrealised profit or loss on open positions."],
    ["Unrealised P/L", "The current open profit or loss of positions that have not been closed yet."],
    ["Margin", "The funds reserved to keep a leveraged position open. Candleflow's demo mode simulates positions without leverage risk."],
    ["Volatility", "How much and how quickly a price moves. Higher volatility means larger swings in either direction."]
  ];
  const list = document.getElementById("glossaryList");
  if (!list) return;
  list.innerHTML = glossary.map(function(entry) {
    return '<div class="glossary-item"><details class="glossary-details"><summary>' + entry[0] + "</summary><p>" + entry[1] + "</p></details></div>";
  }).join("");
})();