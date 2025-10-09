// Currency conversion utility using a free API
export interface CurrencyRates {
  [key: string]: number;
}

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
}

// Cache for exchange rates (valid for 1 hour)
let ratesCache: { data: CurrencyRates; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Free currency API endpoint
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export const getExchangeRates = async (): Promise<CurrencyRates> => {
  // Check if we have valid cached data
  if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
    return ratesCache.data;
  }

  try {
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    const rates = data.rates;
    
    // Cache the rates
    ratesCache = {
      data: rates,
      timestamp: Date.now()
    };
    
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Fallback to cached data if available, otherwise return default rates
    if (ratesCache) {
      return ratesCache.data;
    }
    
    // Fallback rates (approximate values)
    return {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      INR: 83.0,
      JPY: 110.0,
      CAD: 1.25,
      AUD: 1.35,
      CHF: 0.92,
      CNY: 6.45,
      SGD: 1.35,
    };
  }
};

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> => {
  if (fromCurrency === toCurrency) {
    return {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: amount,
      rate: 1,
    };
  }

  try {
    const rates = await getExchangeRates();
    
    // Convert to USD first if not already USD
    let amountInUSD = amount;
    if (fromCurrency !== 'USD') {
      amountInUSD = amount / rates[fromCurrency];
    }
    
    // Convert from USD to target currency
    let convertedAmount = amountInUSD;
    if (toCurrency !== 'USD') {
      convertedAmount = amountInUSD * rates[toCurrency];
    }
    
    const rate = convertedAmount / amount;
    
    return {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      rate: Math.round(rate * 10000) / 10000, // Round to 4 decimal places
    };
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new Error('Failed to convert currency');
  }
};

export const getSupportedCurrencies = (): string[] => {
  return [
    'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'
  ];
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

