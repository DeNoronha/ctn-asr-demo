/**
 * AddressMap Component
 * Displays a Google Maps embed for a given address
 *
 * Uses Google Maps Embed API (no API key required for basic usage)
 * For advanced features, set VITE_GOOGLE_MAPS_API_KEY in .env
 */

import { Text } from '@mantine/core';
import type React from 'react';

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
  height = 250,
}) => {
  // Build full address string for geocoding
  const fullAddress = [address, postalCode, city, country]
    .filter(Boolean)
    .join(', ');

  // URL encode the address for the embed
  const encodedAddress = encodeURIComponent(fullAddress);

  // Check for API key - if available, use Maps JavaScript API, otherwise use static embed
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

  // Use Google Maps Embed API (free tier, no API key required for basic embedding)
  // Note: For production with higher usage, an API key is recommended
  const embedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`
    : `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

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
