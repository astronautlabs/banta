import { Feature } from '../../saas';

export const FEATURES : Feature[] =  [
    {
        id: 'chat',
        name: 'Realtime Chat',
        iconName: 'chat',
        skus: ['oss', 'engage', 'enterprise'],
        summary: `
            Let your audience experience first-class,
            cross-platform live chat during your live 
            events
        `
    },
    {
        id: 'comments',
        name: 'Realtime Comments',
        iconName: 'comment',
        skus: ['oss', 'engage', 'enterprise'],
        summary: `
            Let your audience engage in threaded conversations
            during your live events
        `
    },
    {
        id: 'hosted',
        name: 'Managed Hosting',
        iconName: 'flight_takeoff',
        skus: ['engage', 'enterprise'],
        summary: `
            We will set up and manage everything needed to 
            host Banta on your behalf
        `
    },
    {
        id: 'sso',
        name: 'Single Sign On',
        iconName: 'security',
        skus: ['enterprise'],
        summary: 'Provide your own authentication and login stack'
    },
    {
        id: 'support',
        name: 'Support',
        iconName: 'contact_support',
        skuContent: {
            oss: `Community supported`,
            engage: `9AM-5PM PST, M-F excluding US holidays`,
            enterprise: `24/7 support available`
        },
        summary: `
            We want you to be successful. 
            We provide support options that help you make 
            the most out of your purchase.
        `
    }
];