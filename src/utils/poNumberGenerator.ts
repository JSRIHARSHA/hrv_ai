/**
 * Generates PO numbers based on entity and current financial year
 * Format: ENTITYPORYYYY-00XX
 * where YYYY is the financial year (e.g., 2526 for 2025-2026)
 * and XX is a sequential number starting from 01
 */

interface POGenerationParams {
  entity: 'HRV' | 'NHG';
  existingOrders: Array<{ orderId: string; poNumber?: string; entity?: 'HRV' | 'NHG' }>;
}

/**
 * Gets the current financial year in India (April to March)
 * Returns format YYYY (e.g., 2526 for 2025-2026 financial year)
 */
function getCurrentFinancialYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Financial year in India runs from April (month 4) to March (month 3)
  // If month is April (4) to December (12), FY is currentYear to currentYear+1
  // If month is January (1) to March (3), FY is (currentYear-1) to currentYear
  let fyStart: number;
  if (currentMonth >= 4) {
    // April to December: FY is currentYear-currentYear+1
    fyStart = currentYear;
  } else {
    // January to March: FY is (currentYear-1)-currentYear
    fyStart = currentYear - 1;
  }
  
  const fyEnd = fyStart + 1;
  
  // Format: Last two digits of start year + last two digits of end year
  // e.g., 2025-2026 becomes 2526
  const fyString = `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`;
  
  return fyString;
}

/**
 * Generates a sequential PO number for the given entity
 */
export function generatePONumber({ entity, existingOrders }: POGenerationParams): string {
  const financialYear = getCurrentFinancialYear();
  const prefix = `${entity}POR${financialYear}-00`;
  
  // Filter orders for the same entity and extract sequence numbers
  const sameEntityOrders = existingOrders.filter(order => {
    // Check if order has entity field and matches
    if (order.entity && order.entity === entity) {
      // Check if PO number matches the pattern
      if (order.poNumber && order.poNumber.startsWith(prefix)) {
        return true;
      }
    }
    // Also check if poNumber exists and matches entity prefix (for backwards compatibility)
    if (order.poNumber && order.poNumber.startsWith(`${entity}POR`)) {
      return true;
    }
    return false;
  });
  
  // Extract sequence numbers
  const sequenceNumbers = sameEntityOrders
    .map(order => {
      if (!order.poNumber) return -1;
      // Match pattern: ENTITYPORYYYY-00XX
      const match = order.poNumber.match(/-00(\d+)$/);
      return match ? parseInt(match[1], 10) : -1;
    })
    .filter(num => num >= 0);
  
  // Find the next available sequence number
  const nextSequence = sequenceNumbers.length > 0 
    ? Math.max(...sequenceNumbers) + 1 
    : 1; // Start from 01
  
  // Format sequence number with leading zeros (minimum 2 digits)
  const sequenceString = nextSequence.toString().padStart(2, '0');
  
  return `${prefix}${sequenceString}`;
}

/**
 * Gets the current financial year string
 */
export function getFinancialYear(): string {
  return getCurrentFinancialYear();
}









