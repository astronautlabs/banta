import { Sku } from '../../saas';

export const SKUS : Sku[] = [
    {
        id: 'oss',
        name: 'Open Source',
        rank: 1,
        showInMatrix: true,
        summary: 'Get started quick',
        priceOptions: ['Free']
    },
    {
        id: 'engage',
        name: 'Engage',
        rank: 2,
        showInMatrix: true,
        summary: 'Get started quick',
        priceOptions: ['$50/mo', '$500/yr']
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        rank: 3,
        showInMatrix: true,
        summary: 'Get started quick',
        priceOptions: ['Contact us']
    }
];