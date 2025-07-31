const symbolMapper = require('../../utils/symbolMapper');

const ICON_SOURCES = {
  COINGECKO: 'coingecko',
  CRYPTOICON: 'cryptoicon',
  LOCAL: 'local'
};

class IconService {
  constructor(source = ICON_SOURCES.COINGECKO) {
    this.source = source;
    this.coinGeckoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      // Add more mappings as needed
    };
  }

  getIconUrl(symbol) {
    const cleanSymbol = symbolMapper.cleanSymbol(symbol);
    
    switch(this.source) {
      case ICON_SOURCES.COINGECKO:
        return this._getCoinGeckoIcon(cleanSymbol);
      case ICON_SOURCES.CRYPTOICON:
        return this._getCryptoIcon(cleanSymbol);
      case ICON_SOURCES.LOCAL:
        return this._getLocalIcon(cleanSymbol);
      default:
        return this._getDefaultIcon();
    }
  }

  _getCoinGeckoIcon(symbol) {
    const coinId = this.coinGeckoIds[symbol] || symbol.toLowerCase();
    return `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`;
  }

  _getCryptoIcon(symbol) {
    return `https://cryptoicon-api.vercel.app/api/icon/${symbol.toLowerCase()}`;
  }

  _getLocalIcon(symbol) {
    return `/assets/crypto-icons/${symbol.toLowerCase()}.png`;
  }

  _getDefaultIcon() {
    return '/assets/crypto-icons/generic.png';
  }
}

module.exports = {
  IconService,
  ICON_SOURCES
};