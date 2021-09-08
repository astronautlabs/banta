export interface EnvironmentVariables {
    ENVIRONMENT : string;
    GCP_PROJECT_ID : string;

    SOURCE_CONTENT_BUCKET : string;
    CONTENT_ASSETS_BUCKET : string;
    BUCKET_ACCESS_KEY : string;
    BUCKET_ACCESS_SECRET : string;

    LOCAL_GCP_CREDENTIALS_FILE : string;
    LOCAL_GCP_CREDENTIALS : string;
    STAGING_DIRECTORY : string;
    FIREBASE_FIRESTORE_URL : string;
    SENDGRID_API_KEY : string;

    STRIPE_API_KEY : string;

    REDIS_PORT : string;
    REDIS_HOST : string;
    REDIS_DB : string;
    TRANSCODE_THREADS : string;
    URL : string;
}
