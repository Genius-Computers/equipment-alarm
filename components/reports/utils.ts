/**
 * Shared utility functions for report components
 */

export const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

export const formatNumber = (num: number): string => num.toLocaleString();

export const formatPercentage = (value: number, decimals: number = 1): string => 
  `${value.toFixed(decimals)}%`;

export const formatHours = (hours: number, decimals: number = 1): string => 
  `${hours.toFixed(decimals)}h`;

export const formatServiceRequestType = (type: string): string => 
  type.replace('_', ' ').toUpperCase();

export const getTechnicianDisplayName = (technician: { id: string; displayName?: string }): string => 
  technician.displayName || `Tech ${technician.id.slice(0, 8)}`;

export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
