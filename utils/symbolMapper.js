const SYMBOL_MAPPINGS = {
	'X:BTCUSD': 'BTC',
	'X:ETHUSD': 'ETH',
	'X:BNBUSD': 'BNB',
	'X:SOLUSD': 'SOL',
	'X:XRPUSD': 'XRP',
	'X:ADAUSD': 'ADA',
	'X:DOGEUSD': 'DOGE',
	'X:DOTUSD': 'DOT',
	'X:AVAXUSD': 'AVAX',
	'X:LTCUSD': 'LTC',
	'X:LINKUSD': 'LINK',
	'X:MATICUSD': 'MATIC',
	'X:UNIUSD': 'UNI',
	'X:ATOMUSD': 'ATOM',
	'X:ALGOUSD': 'ALGO',
	'X:ETCUSD': 'ETC',
	'X:BCHUSD': 'BCH',
	'X:XLMUSD': 'XLM',
	'X:VETUSD': 'VET',
	'X:THETAUSD': 'THETA',
	'X:ICPUSD': 'ICP',
	'X:FILUSD': 'FIL',
	'X:TRXUSD': 'TRX',
	'X:XMRUSD': 'XMR',
	'X:EOSUSD': 'EOS',
	'X:AAVEUSD': 'AAVE',
	'X:CAKEUSD': 'CAKE',
	'X:AXSUSD': 'AXS',
	'X:NEOUSD': 'NEO',
	'X:GRTUSD': 'GRT',
	'X:XTZUSD': 'XTZ',
	'X:MANAUSD': 'MANA',
	'X:SANDUSD': 'SAND',
	'X:CHZUSD': 'CHZ',
	'X:ENJUSD': 'ENJ',
	'X:HBARUSD': 'HBAR',
	'X:FLOWUSD': 'FLOW',
	'X:ONEUSD': 'ONE',
	'X:GALAUSD': 'GALA',
	'X:APEUSD': 'APE',
	'X:RUNEUSD': 'RUNE',
	'X:QNTUSD': 'QNT',
	'X:IMXUSD': 'IMX',
	'X:MINAUSD': 'MINA',
	'X:CRVUSD': 'CRV',
	'X:STXUSD': 'STX',
	'X:ARUSD': 'AR',
	'X:FETUSD': 'FET',
	'X:COMPUSD': 'COMP',
	'X:SNXUSD': 'SNX',
	'X:ZECUSD': 'ZEC',
	'X:DASHUSD': 'DASH',
	'X:KAVAUSD': 'KAVA',
	'X:WAVESUSD': 'WAVES',
	'X:RVNUSD': 'RVN',
	'X:1INCHUSD': '1INCH',
	'X:ANKRUSD': 'ANKR',
	'X:CELOUSD': 'CELO',
	'X:CHRUSD': 'CHR',
	'X:COTIUSD': 'COTI',
	'X:DYDXUSD': 'DYDX',
	'X:EGLDUSD': 'EGLD',
	'X:FTMUSD': 'FTM',
	'X:GNOUSD': 'GNO',
	'X:HNTUSD': 'HNT',
	'X:IOTAUSD': 'IOTA',
	'X:JASMYUSD': 'JASMY',
	'X:KSMUSD': 'KSM',
	'X:LRCUSD': 'LRC',
	'X:MTLUSD': 'MTL',
	'X:OCEANUSD': 'OCEAN',
	'X:OMGUSD': 'OMG',
	'X:PERPUSD': 'PERP',
	'X:PONDUSD': 'POND',
	'X:QTUMUSD': 'QTUM',
	'X:RAYUSD': 'RAY',
	'X:RENUSD': 'REN',
	'X:SKLUSD': 'SKL',
	'X:STORJUSD': 'STORJ',
	'X:SUSHIUSD': 'SUSHI',
	'X:UMAUSD': 'UMA',
	'X:YFIUSD': 'YFI',
	'X:ZILUSD': 'ZIL',
	'X:ZRXUSD': 'ZRX'
}

const REVERSE_MAPPINGS = Object.fromEntries(Object.entries(SYMBOL_MAPPINGS).map(([k, v]) => [v, k]))

function extractBaseSymbol(polygonSymbol) {
	return SYMBOL_MAPPINGS[polygonSymbol] || polygonSymbol.split(':')[1]?.replace('USD', '') || polygonSymbol
}

function toPolygonSymbol(baseSymbol) {
	return REVERSE_MAPPINGS[baseSymbol] || `X:${baseSymbol}USD`
}

function cleanSymbol(symbol) {
	return symbol.replace('X:', '').replace('USD', '')
}

module.exports = {
	extractBaseSymbol,
	toPolygonSymbol,
	cleanSymbol,
	SYMBOL_MAPPINGS
}
