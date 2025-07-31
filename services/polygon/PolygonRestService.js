const axios = require('axios');
const symbolMapper = require('../../utils/symbolMapper');

class PolygonRestService {
  constructor() {
    this.apiKey = '78hO5g90HYMrUwS0sntujCmD3hH9YzNp';
    this.baseUrl = 'https://api.polygon.io/v2';
    this.referenceUrl = 'https://api.polygon.io/v3';
  }

  async getAggregates(symbol, timespan = 'day', from, to, limit = 120) {
    try {
      const formattedSymbol = `X:${symbol}USD`;
      const response = await axios.get(
        `${this.baseUrl}/aggs/ticker/${formattedSymbol}/range/1/${timespan}/${from}/${to}`,
        {
          params: { adjusted: true, sort: 'asc', limit },
          headers: { Authorization: `Bearer ${this.apiKey}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching aggregates:', error.response?.data || error.message);
      return null;
    }
  }

  async getTickerDetails(symbol) {
    try {
      const response = await axios.get(
        `${this.referenceUrl}/reference/tickers/X:${symbol}USD`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching ticker details:', error);
      return null;
    }
  }

  async getLastTrade(symbol) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/last/trade/X:${symbol}USD`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching last trade:', error);
      return null;
    }
  }
}

module.exports = new PolygonRestService();