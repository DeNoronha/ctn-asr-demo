/**
 * Partner Logos Component
 * Displays CTN partner organization logos
 */

import { Card, Group, Text } from '@mantine/core';
import type React from 'react';

const partners = [
  { name: 'Contargo', logo: '/assets/logos/contargo.png' },
  { name: 'Inland Terminals Group', logo: '/assets/logos/Inland Terminals Group.png' },
  { name: 'Van Berkel', logo: '/assets/logos/VanBerkel.png' },
  { name: 'DIL', logo: '/assets/logos/DIL.png' },
  { name: 'Portbase', logo: '/assets/logos/portbase.png' },
];

export const PartnerLogos: React.FC = () => (
  <Card padding="lg" radius="md" withBorder mt="xl" style={{ background: '#f9fafb' }}>
    <Text size="md" fw={600} ta="center" mb="md" c="#374151">
      In Partnership With
    </Text>
    <Group gap="lg" justify="center" wrap="wrap">
      {partners.map((partner) => (
        <Card
          key={partner.name}
          withBorder
          padding="md"
          radius="md"
          style={{
            transition: 'all 0.2s ease',
            background: 'white',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0066b3';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 102, 179, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <img
            src={partner.logo}
            alt={`${partner.name} - CTN Partner`}
            style={{ height: 32, width: 'auto', display: 'block' }}
          />
        </Card>
      ))}
    </Group>
  </Card>
);
