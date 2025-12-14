/**
 * Address Formatting Utilities
 * Formats addresses according to country-specific postal standards
 *
 * References:
 * - https://www.parcelforce.com/help-and-advice/sending/address-formats
 * - https://en.wikipedia.org/wiki/Address_format_by_country_and_area
 * - https://www.postgrid.com/international-postal-address-standards-formats/
 */

export interface AddressInput {
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  province?: string | null;
  country_code?: string | null;
}

export interface FormattedAddress {
  streetLine: string;
  postalCityLine: string;
  countryLine?: string;
  fullAddress: string;
}

/**
 * Format a Dutch postal code
 * Format: 4 digits + space + 2 uppercase letters (e.g., "2312 BK")
 */
function formatDutchPostalCode(postalCode: string): string {
  // Remove all spaces and uppercase
  const clean = postalCode.replace(/\s/g, '').toUpperCase();
  // Insert space after 4 digits
  if (clean.length >= 6 && /^\d{4}[A-Z]{2}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  return postalCode;
}

/**
 * Format address for Netherlands (NL)
 * Format:
 *   <Street> <House Number> <Addition>
 *   <Postal Code>  <CITY>
 *
 * Example: Morsstr 111, 2312 BK  LEIDEN
 */
function formatDutchAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code
    ? formatDutchPostalCode(address.postal_code)
    : '';
  // Dutch standard: double space between postal code and city, city in CAPITALS
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode}  ${city}` // Double space per Dutch standard
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'NETHERLANDS',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Format address for Germany (DE)
 * Format:
 *   <Street> <House Number>
 *   <Postal Code> <CITY>
 *
 * Example: Weberstr. 2, 53113 BONN
 */
function formatGermanAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'GERMANY',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Format address for Belgium (BE)
 * Format:
 *   <Street> <House Number>
 *   <Postal Code> <CITY>
 *
 * Example: Rue du Diamant 215, 4800 VERVIERS
 * Note: No separators between postal code and city
 */
function formatBelgianAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'BELGIUM',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Format address for France (FR)
 * Format:
 *   <House Number> <Street>
 *   <Postal Code> <CITY CEDEX>
 *
 * Example: 23 Rue de Grenelle, 75700 PARIS CEDEX
 */
function formatFrenchAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'FRANCE',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Format address for Austria (AT)
 * Format:
 *   <Street> <House Number>
 *   <Postal Code> <CITY>
 *
 * Similar to Germany
 */
function formatAustrianAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'AUSTRIA',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Format address for Switzerland (CH)
 * Format:
 *   <Street> <House Number>
 *   <Postal Code> <CITY>
 *
 * Example: Schanzenstrasse 7, 3030 BERNE
 */
function formatSwissAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city?.toUpperCase() || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: 'SWITZERLAND',
    fullAddress: [streetLine, postalCityLine].filter(Boolean).join('\n'),
  };
}

/**
 * Default format for other countries
 */
function formatDefaultAddress(address: AddressInput): FormattedAddress {
  const streetLine = [address.address_line1, address.address_line2]
    .filter(Boolean)
    .join(', ');

  const postalCode = address.postal_code || '';
  const city = address.city || '';
  const postalCityLine = postalCode && city
    ? `${postalCode} ${city}`
    : postalCode || city;

  return {
    streetLine,
    postalCityLine,
    countryLine: address.country_code || undefined,
    fullAddress: [streetLine, postalCityLine, address.country_code]
      .filter(Boolean)
      .join('\n'),
  };
}

/**
 * Format an address according to country-specific standards
 */
export function formatAddress(address: AddressInput): FormattedAddress {
  const countryCode = address.country_code?.toUpperCase();

  switch (countryCode) {
    case 'NL':
      return formatDutchAddress(address);
    case 'DE':
      return formatGermanAddress(address);
    case 'BE':
      return formatBelgianAddress(address);
    case 'FR':
      return formatFrenchAddress(address);
    case 'AT':
      return formatAustrianAddress(address);
    case 'CH':
      return formatSwissAddress(address);
    default:
      return formatDefaultAddress(address);
  }
}

/**
 * Format postal code and city as a single line according to country standards
 */
export function formatPostalCodeCity(
  postalCode: string | null | undefined,
  city: string | null | undefined,
  countryCode: string | null | undefined
): string {
  if (!postalCode && !city) return '-';

  const code = countryCode?.toUpperCase();
  const formattedPostal = code === 'NL' && postalCode
    ? formatDutchPostalCode(postalCode)
    : postalCode;

  // For NL: double space, city in capitals
  // For other EU countries: single space, city in capitals
  const formattedCity = ['NL', 'DE', 'BE', 'FR', 'AT', 'CH'].includes(code || '')
    ? city?.toUpperCase()
    : city;

  const separator = code === 'NL' ? '  ' : ' ';

  if (formattedPostal && formattedCity) {
    return `${formattedPostal}${separator}${formattedCity}`;
  }
  return formattedPostal || formattedCity || '-';
}

/**
 * Get country name from country code
 */
export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return '-';

  const countryNames: Record<string, string> = {
    NL: 'Netherlands',
    DE: 'Germany',
    BE: 'Belgium',
    FR: 'France',
    AT: 'Austria',
    CH: 'Switzerland',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    US: 'United States',
    IT: 'Italy',
    ES: 'Spain',
    PT: 'Portugal',
    PL: 'Poland',
    CZ: 'Czech Republic',
    DK: 'Denmark',
    SE: 'Sweden',
    NO: 'Norway',
    FI: 'Finland',
    IE: 'Ireland',
    LU: 'Luxembourg',
  };

  return countryNames[countryCode.toUpperCase()] || countryCode;
}
