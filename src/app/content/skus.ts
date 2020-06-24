import { Sku } from '@astronautlabs/licensing';

export const SKUS : Sku[] = [
    {
        id: 'open-source',
        name: 'Open Source',
        rank: 1,
        showInMatrix: true,
        summary: 'Get started quickly',
        support: 'Community supported',
        price: 'Free'
      },
      {
        id: 'engage',
        name: 'Engage',
        rank: 1,
        showInMatrix: true,
        summary: '',
        support: `
          9AM-5PM PST, M-F  
          _excluding US holidays_
        `,
        price: `
          $50/mo  
          _-or-_  
          $500/yr
        `
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        rank: 2,
        showInMatrix: true,
        summary: '',
        support: `24/7 support available`,
        price: 'Contact us'
      }
];