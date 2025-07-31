const SYMBOL_MAPPINGS = {
  'X:BTCUSD': 'BTC',
  'X:ETHUSD': 'ETH',
  'X:BNBUSD': 'BNB',
  'X:SOLUSD': 'SOL',
  'X:XRPUSD': 'XRP',
  // Add more mappings as needed
};

const REVERSE_MAPPINGS = Object.fromEntries(
  Object.entries(SYMBOL_MAPPINGS).map(([k, v]) => [v, k])
);

function extractBaseSymbol(polygonSymbol) {
  return SYMBOL_MAPPINGS[polygonSymbol] || polygonSymbol.split(':')[1]?.replace('USD', '') || polygonSymbol;
}

function toPolygonSymbol(baseSymbol) {
  return REVERSE_MAPPINGS[baseSymbol] || `X:${baseSymbol}USD`;
}

function cleanSymbol(symbol) {
  return symbol.replace('X:', '').replace('USD', '');
}

module.exports = {
  extractBaseSymbol,
  toPolygonSymbol,
  cleanSymbol,
  SYMBOL_MAPPINGS
};