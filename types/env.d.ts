declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    BUN_PUBLIC_BASE_URL?: string;
    PORT?: string;
    WWEBJS_AUTH?: string;
    WWEBJS_CACHE?: string;
    WA_TOKEN?: string;
    WA_APP_SECRET?: string;
    WA_PHONE_NUMBER_ID?: string;
    APP_LOGS_PATH?: string;
  }
}
