"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WATCHED_INSTRUMENTS = void 0;
exports.instrumentForPair = instrumentForPair;
exports.instrumentForSymbol = instrumentForSymbol;
exports.WATCHED_INSTRUMENTS = [
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
function instrumentForPair(displayPair) {
    return exports.WATCHED_INSTRUMENTS.find((i) => i.displayPair === displayPair.toUpperCase().replace("/", ""));
}
function instrumentForSymbol(symbol) {
    return exports.WATCHED_INSTRUMENTS.find((i) => i.symbol === symbol);
}
//# sourceMappingURL=instruments.js.map