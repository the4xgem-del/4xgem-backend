export interface InstrumentDef {
  symbol: string; // provider-format symbol, e.g. "EUR/USD"
  displayPair: string; // matches TradingSignal.pair convention, e.g. "EURUSD"
  category: "FOREX" | "GOLD" | "CRYPTO";
  /** A realistic starting price for the simulated provider's random walk. */
  basePrice: number;
  /** Size of one "pip"/point in this instrument's own price units. */
  pipSize: number;
}

export const WATCHED_INSTRUMENTS: InstrumentDef[] = [
  { symbol: "EUR/USD", displayPair: "EURUSD", category: "FOREX", basePrice: 1.0875, pipSize: 0.0001 },
  { symbol: "GBP/USD", displayPair: "GBPUSD", category: "FOREX", basePrice: 1.2715, pipSize: 0.0001 },
  { symbol: "USD/JPY", displayPair: "USDJPY", category: "FOREX", basePrice: 156.8, pipSize: 0.01 },
  { symbol: "GBP/JPY", displayPair: "GBPJPY", category: "FOREX", basePrice: 193.45, pipSize: 0.01 },
  { symbol: "AUD/USD", displayPair: "AUDUSD", category: "FOREX", basePrice: 0.665, pipSize: 0.0001 },
  { symbol: "USD/CAD", displayPair: "USDCAD", category: "FOREX", basePrice: 1.365, pipSize: 0.0001 },
  { symbol: "XAU/USD", displayPair: "XAUUSD", category: "GOLD", basePrice: 2345.5, pipSize: 0.1 },
  { symbol: "BTC/USD", displayPair: "BTCUSD", category: "CRYPTO", basePrice: 62450, pipSize: 1 },
  { symbol: "ETH/USD", displayPair: "ETHUSD", category: "CRYPTO", basePrice: 3245, pipSize: 0.1 },
];

export function instrumentForPair(displayPair: string): InstrumentDef | undefined {
  return WATCHED_INSTRUMENTS.find((i) => i.displayPair === displayPair.toUpperCase().replace("/", ""));
}

export function instrumentForSymbol(symbol: string): InstrumentDef | undefined {
  return WATCHED_INSTRUMENTS.find((i) => i.symbol === symbol);
}
