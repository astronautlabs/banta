# @/banta
> **⚠ Alpha** | [🌐 Website](http://bantachat.com/) | [📦 NPM](https://npmjs.com/package/@banta/sdk)

This is the Banta project, an effort to create an open framework for chatting/comments on the web. The codebase is a 
monorepo, containing several components. You can find the components under the `packages/` directory.

![demo](demo.gif)

[Try it out](https://bantachat.com/try)

## Components

`packages/`
- `client/` -- @banta/client: Contains shared code for connecting to a Banta backend
- `common/` -- @banta/common: Contains code common to both the frontend and backend
- `firebase/` -- @banta/firebase: A plugin for using Firebase/Firestore as the backing store for Banta
- `frontend/` -- @banta/frontend: Contains the Banta website as well as the Angular SDK
    - `projects/sdk` -- @banta/sdk: Contains the client SDK for Angular
- `server/` -- @banta/server: Library for creating Banta backend servers

# Development Workflow

Banta is split into several modular packages which presents some challenges to setting up a development environment. We use `lerna` to manage this complexity. See below for specific guidance on setting up frontend and backend developer workflows. 

## Frontend

To set up a development space for this project, perform the following steps:

```shell
lerna bootstrap    # installs all dependencies
lerna link         # links dependent packages together without using the published NPM packages
lerna run build    # build all packages from source
cd frontend        # enter the Bantachat.com application which is also a cradle for doing development
npm start          # start the Angular application
```

From here, if you modify a particular package, you will need to rebuild that package by entering it's 
directory and using `npm build` in order for the Angular app to pick it up.

## Live developing SDK within external apps 

If you wish to use `npm link` to work on the SDK from within the context of your own app, you will need to do:

```shell
# In banta project:
cd packages/frontend
npm run build:lib
cd dist/sdk             # IMPORTANT!
npm run start:lib       # will rebuild the SDK package whenever it changes

# In your app project:
npm link @banta/sdk
npm start               # will rebuild your project whenever the SDK changes
```

## Backend

By default the Angular app uses "MockBackend", which implements Banta's "ChatBackend" interface to provide a constant stream of fake messages. This is sufficient for doing UI development, but it is not sufficient for doing development on Banta's built-in real backends, such as Firebase (`@/firebase`) or the Server/Client system (`@/server` and `@/client`). 

Though sending messages via Firebase is fully implemented, our project's Firebase backends are not yet equipped with appropriate Firestore access rules to permit the web frontend to send messages without a server intermediary (even when using the Firebase AuthenticationProvider). Thus in order to test Banta using a "real" backend you will need to run the included `test-server` and configure the `frontend` application to use it.

The `app.module.ts` file already has commented out providers which connect the Banta SDK to a Firebase-backed Client/Server backend. Simply toggle on the necessary configuration in that file, which will automatically disable the default `MockBackend`.

For getting a working server up, you must run `test-server`. If all steps above were taken, you can simply enter `packages/server/test-server` and run `npm start` and you should see the server start. See the [@/server README](packages/server/README.md) for more details.