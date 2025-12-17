/**
 * AddressMap Component
 * Displays a Google Maps embed for a given address
 *
 * Uses Google Maps Embed API
 * API key configured via VITE_GOOGLE_MAPS_API_KEY environment variable
 */

import { Text } from '@mantine/core';
import type React from 'react';

// Google Maps API key from environment (shared across CTN projects)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface AddressMapProps {
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  height?: number;
}

export const AddressMap: React.FC<AddressMapProps> = ({
  address,
  city,
  postalCode,
  country,
  height = 200,
}) => {
  // Build full address string for geocoding
  const fullAddress = [address, postalCode, city, country]
    .filter(Boolean)
    .join(', ');

  // URL encode the address for the embed
  const encodedAddress = encodeURIComponent(fullAddress);

  // Show placeholder if no address or no API key
  if (!address && !city) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          border: '1px dashed #dee2e6',
        }}
      >
        <Text c="dimmed" size="sm">
          No address available for map display
        </Text>
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          border: '1px dashed #dee2e6',
        }}
      >
        <Text c="dimmed" size="sm">
          Map unavailable (API key not configured)
        </Text>
      </div>
    );
  }

  // Google Maps Embed API
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedAddress}`;

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #dee2e6' }}>
      <iframe
        title={`Map of ${fullAddress}`}
        src={embedUrl}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};
