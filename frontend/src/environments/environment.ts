// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  engageServiceUrl: 'http://localhost:3000',
  firebase: {
    // apiKey: "AIzaSyAyLVhVnAhSblJJ7aRNFrHr9-E8MrvJbN4",
    // authDomain: "engagechat-dev.firebaseapp.com",
    // databaseURL: "https://engagechat-dev.firebaseio.com",
    // projectId: "engagechat-dev",
    // storageBucket: "engagechat-dev.appspot.com",
    // messagingSenderId: "411748918221",
    // appId: "1:411748918221:web:6a966fc5eb47a8cae91a84",
    // measurementId: "G-TFCMM2WM56"

      
    apiKey: "AIzaSyAJ1OjZCWrP5VQl29v_2GJmQq2O_kXyYj4",
    authDomain: "engagechat-prod.firebaseapp.com",
    databaseURL: "https://engagechat-prod.firebaseio.com",
    projectId: "engagechat-prod",
    storageBucket: "engagechat-prod.appspot.com",
    messagingSenderId: "912945474622",
    appId: "1:912945474622:web:d787d14e0aeab25961356f",
    measurementId: "G-E872QV59B0"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/dist/zone-error';  // Included with Angular CLI.