/**
 * DCSA Location Codes Reference Data
 * UN/LOCODE (United Nations Code for Trade and Transport Locations)
 * Format: 2-letter country code + 3-letter location code
 *
 * Source: https://unece.org/trade/cefact/unlocode-code-list-country-and-territory
 * DCSA Standard: https://dcsa.org/standards/
 */

import { FacilityType } from './dcsaSchemas';

export interface DCSALocation {
  UNLocationCode: string;       // e.g., "NLRTM" for Rotterdam
  locationName: string;          // Full name
  country: string;               // Country name
  countryCode: string;           // ISO 2-letter country code
  facilityType: FacilityType;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  iataCode?: string;             // For airports
  portAuthorityWebsite?: string;
  remarks?: string;
}

/**
 * Major European Seaports - Container Terminals
 */
export const EUROPEAN_SEAPORTS: DCSALocation[] = [
  // Netherlands
  {
    UNLocationCode: 'NLRTM',
    locationName: 'Rotterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 51.9244, longitude: 4.4777 },
    portAuthorityWebsite: 'https://www.portofrotterdam.com',
    remarks: 'Largest port in Europe'
  },
  {
    UNLocationCode: 'NLAMS',
    locationName: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 52.3676, longitude: 4.9041 }
  },

  // Belgium
  {
    UNLocationCode: 'BEANR',
    locationName: 'Antwerp',
    country: 'Belgium',
    countryCode: 'BE',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 51.2194, longitude: 4.4025 },
    portAuthorityWebsite: 'https://www.portofantwerp.com',
    remarks: 'Second largest port in Europe'
  },
  {
    UNLocationCode: 'BEZEE',
    locationName: 'Zeebrugge',
    country: 'Belgium',
    countryCode: 'BE',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 51.3333, longitude: 3.2167 }
  },

  // Germany
  {
    UNLocationCode: 'DEHAM',
    locationName: 'Hamburg',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 53.5511, longitude: 9.9937 },
    portAuthorityWebsite: 'https://www.hafen-hamburg.de'
  },
  {
    UNLocationCode: 'DEBRE',
    locationName: 'Bremerhaven',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 53.5395, longitude: 8.5809 }
  },

  // France
  {
    UNLocationCode: 'FRLEH',
    locationName: 'Le Havre',
    country: 'France',
    countryCode: 'FR',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 49.4944, longitude: 0.1079 }
  },
  {
    UNLocationCode: 'FRMRS',
    locationName: 'Marseille',
    country: 'France',
    countryCode: 'FR',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 43.2965, longitude: 5.3698 }
  },

  // UK
  {
    UNLocationCode: 'GBFXT',
    locationName: 'Felixstowe',
    country: 'United Kingdom',
    countryCode: 'GB',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 51.9542, longitude: 1.3511 },
    remarks: 'UK largest container port'
  },
  {
    UNLocationCode: 'GBSOU',
    locationName: 'Southampton',
    country: 'United Kingdom',
    countryCode: 'GB',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 50.9097, longitude: -1.4044 }
  },

  // Spain
  {
    UNLocationCode: 'ESVLC',
    locationName: 'Valencia',
    country: 'Spain',
    countryCode: 'ES',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 39.4699, longitude: -0.3763 }
  },
  {
    UNLocationCode: 'ESBCN',
    locationName: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 41.3851, longitude: 2.1734 }
  },

  // Italy
  {
    UNLocationCode: 'ITGOA',
    locationName: 'Genoa',
    country: 'Italy',
    countryCode: 'IT',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 44.4056, longitude: 8.9463 }
  },
  {
    UNLocationCode: 'ITVCE',
    locationName: 'Venice',
    country: 'Italy',
    countryCode: 'IT',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 45.4408, longitude: 12.3155 }
  }
];

/**
 * Major Asian Seaports - Container Terminals
 */
export const ASIAN_SEAPORTS: DCSALocation[] = [
  // China
  {
    UNLocationCode: 'CNSHA',
    locationName: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 31.2304, longitude: 121.4737 },
    remarks: 'Worlds busiest container port'
  },
  {
    UNLocationCode: 'CNNGB',
    locationName: 'Ningbo',
    country: 'China',
    countryCode: 'CN',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 29.8683, longitude: 121.5440 }
  },
  {
    UNLocationCode: 'CNYTN',
    locationName: 'Yantian',
    country: 'China',
    countryCode: 'CN',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 22.5833, longitude: 114.2500 }
  },

  // Singapore
  {
    UNLocationCode: 'SGSIN',
    locationName: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 1.3521, longitude: 103.8198 },
    portAuthorityWebsite: 'https://www.mpa.gov.sg',
    remarks: 'Second busiest container port'
  },

  // Malaysia
  {
    UNLocationCode: 'MYPKG',
    locationName: 'Port Klang',
    country: 'Malaysia',
    countryCode: 'MY',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 3.0019, longitude: 101.3933 }
  },
  {
    UNLocationCode: 'MYPGU',
    locationName: 'Pasir Gudang',
    country: 'Malaysia',
    countryCode: 'MY',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 1.4655, longitude: 103.8896 }
  },

  // South Korea
  {
    UNLocationCode: 'KRPUS',
    locationName: 'Busan',
    country: 'South Korea',
    countryCode: 'KR',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 35.1796, longitude: 129.0756 }
  },

  // Japan
  {
    UNLocationCode: 'JPTYO',
    locationName: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 35.6762, longitude: 139.6503 }
  },

  // UAE
  {
    UNLocationCode: 'AEJEA',
    locationName: 'Jebel Ali',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    facilityType: 'SEAPORT',
    coordinates: { latitude: 25.0106, longitude: 55.0882 },
    remarks: 'Largest port in Middle East'
  }
];

/**
 * Inland Barge Terminals - River Transport
 */
export const INLAND_BARGE_TERMINALS: DCSALocation[] = [
  // Netherlands
  {
    UNLocationCode: 'NLRTM',
    locationName: 'Rotterdam World Gateway',
    country: 'Netherlands',
    countryCode: 'NL',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 51.9513, longitude: 4.0308 },
    remarks: 'Deep-sea container terminal with barge connections'
  },

  // Germany
  {
    UNLocationCode: 'DEDUI',
    locationName: 'Duisburg',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 51.4344, longitude: 6.7623 },
    remarks: 'Largest inland port in Europe'
  },
  {
    UNLocationCode: 'DEKEL',
    locationName: 'Kehl',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 48.5725, longitude: 7.8153 }
  },
  {
    UNLocationCode: 'DEKAR',
    locationName: 'Karlsruhe',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 49.0069, longitude: 8.4037 }
  },

  // Switzerland
  {
    UNLocationCode: 'CHBSL',
    locationName: 'Basel',
    country: 'Switzerland',
    countryCode: 'CH',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 47.5596, longitude: 7.5886 },
    remarks: 'Swiss Rhine Ports'
  },

  // France
  {
    UNLocationCode: 'FRSTR',
    locationName: 'Strasbourg',
    country: 'France',
    countryCode: 'FR',
    facilityType: 'RIVER_BARGE_TERMINAL',
    coordinates: { latitude: 48.5734, longitude: 7.7521 }
  }
];

/**
 * Rail Intermodal Terminals
 */
export const RAIL_INTERMODAL_YARDS: DCSALocation[] = [
  {
    UNLocationCode: 'NLRTM',
    locationName: 'Rotterdam Rail Terminal',
    country: 'Netherlands',
    countryCode: 'NL',
    facilityType: 'RAIL_INTERMODAL_YARD',
    coordinates: { latitude: 51.9244, longitude: 4.4777 }
  },
  {
    UNLocationCode: 'DEHAM',
    locationName: 'Hamburg Rail Terminal',
    country: 'Germany',
    countryCode: 'DE',
    facilityType: 'RAIL_INTERMODAL_YARD',
    coordinates: { latitude: 53.5511, longitude: 9.9937 }
  },
  {
    UNLocationCode: 'BEANR',
    locationName: 'Antwerp Rail Terminal',
    country: 'Belgium',
    countryCode: 'BE',
    facilityType: 'RAIL_INTERMODAL_YARD',
    coordinates: { latitude: 51.2194, longitude: 4.4025 }
  }
];

/**
 * Truck Depots & Empty Container Depots
 */
export const TRUCK_DEPOTS: DCSALocation[] = [
  {
    UNLocationCode: 'NLRTM',
    locationName: 'Rotterdam ECT Delta Terminal',
    country: 'Netherlands',
    countryCode: 'NL',
    facilityType: 'EMPTY_CONTAINER_DEPOT',
    coordinates: { latitude: 51.9400, longitude: 4.0400 }
  },
  {
    UNLocationCode: 'BEANR',
    locationName: 'Antwerp Gate Terminal',
    country: 'Belgium',
    countryCode: 'BE',
    facilityType: 'TRUCK_DEPOT',
    coordinates: { latitude: 51.2700, longitude: 4.4200 }
  }
];

/**
 * All DCSA Locations Combined
 */
export const ALL_DCSA_LOCATIONS: DCSALocation[] = [
  ...EUROPEAN_SEAPORTS,
  ...ASIAN_SEAPORTS,
  ...INLAND_BARGE_TERMINALS,
  ...RAIL_INTERMODAL_YARDS,
  ...TRUCK_DEPOTS
];

/**
 * Lookup helper function
 */
export function findLocationByCode(UNLocationCode: string): DCSALocation | undefined {
  return ALL_DCSA_LOCATIONS.find(loc => loc.UNLocationCode === UNLocationCode);
}

/**
 * Search locations by name (case-insensitive, partial match)
 */
export function searchLocationsByName(searchTerm: string): DCSALocation[] {
  const normalizedSearch = searchTerm.toLowerCase();
  return ALL_DCSA_LOCATIONS.filter(loc =>
    loc.locationName.toLowerCase().includes(normalizedSearch) ||
    loc.country.toLowerCase().includes(normalizedSearch)
  );
}

/**
 * Get locations by country code
 */
export function getLocationsByCountry(countryCode: string): DCSALocation[] {
  return ALL_DCSA_LOCATIONS.filter(loc => loc.countryCode === countryCode);
}

/**
 * Get locations by facility type
 */
export function getLocationsByFacilityType(facilityType: FacilityType): DCSALocation[] {
  return ALL_DCSA_LOCATIONS.filter(loc => loc.facilityType === facilityType);
}
