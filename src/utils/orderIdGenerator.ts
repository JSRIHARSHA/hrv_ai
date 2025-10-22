/**
 * Generates a sequential order ID in the format YYYY-X
 * where YYYY is the current year and X is a sequential number starting from 0
 */

export function generateOrderId(existingOrders: Array<{ orderId: string; createdAt: string }>): string {
  const currentYear = new Date().getFullYear();
  
  // Filter orders from current year
  const currentYearOrders = existingOrders.filter(order => {
    const orderYear = new Date(order.createdAt).getFullYear();
    return orderYear === currentYear && order.orderId.startsWith(`${currentYear}-`);
  });
  
  // Extract sequence numbers from current year orders
  const sequenceNumbers = currentYearOrders
    .map(order => {
      const match = order.orderId.match(/^\d{4}-(\d+)$/);
      return match ? parseInt(match[1], 10) : -1;
    })
    .filter(num => num >= 0);
  
  // Find the next available sequence number
  const nextSequence = sequenceNumbers.length > 0 
    ? Math.max(...sequenceNumbers) + 1 
    : 0;
  
  return `${currentYear}-${nextSequence}`;
}

/**
 * Validates if an order ID follows the YYYY-X format
 */
export function isValidOrderIdFormat(orderId: string): boolean {
  return /^\d{4}-\d+$/.test(orderId);
}

/**
 * Extracts year and sequence number from order ID
 */
export function parseOrderId(orderId: string): { year: number; sequence: number } | null {
  const match = orderId.match(/^(\d{4})-(\d+)$/);
  if (!match) return null;
  
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10)
  };
}

