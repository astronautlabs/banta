import { ProductInit } from '@astronautlabs/chassis';
import { FEATURES } from './features';
import { SKUS } from './skus';

export const PRODUCT : ProductInit = {
    name: 'Banta',
    logoUrl: '/assets/logo.svg',
    summary: 'A short description of this app',
    features: FEATURES,
    skus: SKUS,
    promotionalLicenseAvailability: [],
    faqs: [],
    version: 'Alpha',
    release: '1.0.0alpha1',
    pages: {
        pricing: {
            summary: '',
            callToActionText: 'Try it now',
            callToActionUrl: '/try'
        }
    }
};