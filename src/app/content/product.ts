import { ProductInit } from '@astronautlabs/chassis';
import { FEATURES } from './features';
import { SKUS } from './skus';

export const PRODUCT : ProductInit = {
    id: 'banta',
    name: 'Banta',
    logoUrl: '/assets/logo.svg',
    summary: 'Realtime chat and commenting',
    features: FEATURES,
    skus: SKUS,
    promotionalLicenseAvailability: [],
    faqs: [],
    version: 'Alpha',
    release: '1.0.0alpha1',
    pages: {
        features: {
            summary: '',
            callToActionText: 'Try it now',
            callToActionUrl: '/try'
        }
    }
};