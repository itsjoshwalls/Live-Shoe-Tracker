/**
 * API Client for Sneaker Tracker
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Release {
  id?: string;
  name: string;
  sku?: string;
  date?: string;
  status?: string;
  price?: number;
  currency?: string;
  retailPrice?: number;
  resellPrice?: number;
  images?: string[];
  colorway?: string;
  brand?: string;
  metadata?: Record<string, any>;
}

export interface Retailer {
  id?: string;
  name: string;
  region?: string;
  website?: string;
  type?: 'online' | 'physical' | 'hybrid';
  active?: boolean;
  locations?: any[];
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Fetch all releases from the API
 */
export async function fetchReleases(): Promise<Release[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/releases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Error fetching releases:', error);
    throw error;
  }
}

/**
 * Fetch enhanced releases with ML predictions
 */
export async function fetchEnhancedReleases(): Promise<Release[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/releases/enhanced`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Error fetching enhanced releases:', error);
    throw error;
  }
}

/**
 * Fetch all retailers from the API
 */
export async function fetchRetailers(): Promise<Retailer[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/retailers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Error fetching retailers:', error);
    throw error;
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; uptimeSeconds?: number; timestamp?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

/**
 * Fetch metrics from the API
 */
export async function fetchMetrics(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Subscribe to release notifications
 */
export async function subscribeToReleases(email: string, keywords?: string[]): Promise<APIResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, keywords }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error subscribing:', error);
    throw error;
  }
}
