import { Feature } from '@astronautlabs/licensing';

export const FEATURES : Feature[] =  [
    {
        id: 'realtime-chat',
        name: 'Realtime Chat',
        iconName: 'chat',
        skus: ['open-source', 'engage', 'enterprise'],
        summary: `
          Let your audience experience first-class, cross-platform live 
          chat during your live events
        `
      },
      {
        id: 'realtime-comments',
        name: 'Realtime Comments',
        iconName: 'comment',
        skus: ['open-source', 'engage', 'enterprise'],
        summary: `
          Let your audience engage in threaded conversations during your 
          live events
        `
      },
      {
        id: 'managed-hosting',
        name: 'Managed Hosting',
        iconName: 'flight_takeoff',
        skus: ['engage', 'enterprise'],
        summary: `
          We will set up and manage everything needed to host Banta on 
          your behalf
        `
      },
      {
        id: 'single-sign-on',
        name: 'Single Sign On',
        iconName: 'security',
        skus: ['enterprise'],
        summary: `
          Provide your own authentication and login stack
        `
      }
];