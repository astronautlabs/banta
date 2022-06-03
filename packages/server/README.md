# @/server

Use this library to construct a Banta Server. This allows you to use a custom server implementation to handle message sending with Banta.

This is done by specifying a particular ChatBackendService when using the Banta SDK (`@/sdk`) by using the `BantaServiceChatBackend` implementation provided in `@/client`.

So `@/server` and `@/client` are complementary to each other.

# Development

There is a sample server implementation using this library that can be found in `test-server`. You can use this during development to test new features. 

The expected developer workflow is to first:
- Install all dependencies on all of the modules under `packages/` (`lerna bootstrap`)
- Make sure they are all linked together (`lerna link`)
- Build all dependencies (`lerna run build`)
- Enter the `test-server` directory
- Run `npm start`

You will also need to configure the `frontend` package (which is the Angular application which typically runs at `bantachat.com` to use the `BantaServiceChatBackend` implementation from `@banta/client`). To do so while using the Firebase storage backend, use the following providers in the `frontend` project's `AppModule`:

```typescript
    // ...
    FirebaseStoreRef,
    {
        provide: FirebaseNotificationsProvider,
        deps: [ FirebaseStoreRef ],
        useFactory: storeRef => new FirebaseNotificationsProvider(storeRef)
    },
    {
      provide: FirebaseAuthenticationProvider,
      deps: [ FirebaseStoreRef ],
      useFactory: storeRef => new FirebaseNotificationsProvider(storeRef)
    },
    {
        provide: FirebaseChatBackend,
        deps: [ FirebaseAuthenticationProvider, FirebaseNotificationsProvider, FirebaseStoreRef ],
        useFactory: (auth, notifs, storeRef) => new FirebaseChatBackend(auth, notifs, storeRef)
    },
    {
        provide: ChatBackendService, 
        deps: [ FirebaseChatBackend ],
        useFactory: (firebaseBackend) => 
            new BantaServiceChatBackend(firebaseBackend, 'http://localhost:3422')
    }
```

Note the URL is `http://localhost:3422`, this is the default port for `test-server`.