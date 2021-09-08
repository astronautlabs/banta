# @/banta

This is the Banta project, an effort to create an open framework for chatting/comments on the web. The codebase is a 
monorepo, containing several components. You can find the components under the `packages/` directory.

## Components

`packages/`
- `client/` -- @banta/client: Contains shared code for connecting to a Banta backend
- `common/` -- @banta/common: Contains code common to both the frontend and backend
- `firebase/` -- @banta/firebase: A plugin for using Firebase/Firestore as the backing store for Banta
- `frontend/` -- @banta/frontend: Contains the Banta website as well as the Angular SDK
    - `projects/sdk` -- @banta/sdk: Contains the client SDK for Angular
- `server/` -- @banta/server: Library for creating Banta backend servers
- `test-server/` -- @banta/test-server: A sample Banta backend server using @banta/server library