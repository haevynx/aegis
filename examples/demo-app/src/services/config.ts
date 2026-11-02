// Cấu hình GIẢ. App thật sẽ có secret/URL thật ở đây — scanner phải che hết.
export default {
  TIMEOUT: 30000,

  ENV_DEV: {
    BASE_URL: 'https://dev.api.example.com/',
    SECRET_KEY: 'demo-secret-dev',
    PARTNER_CODE: 'DEMO_MOBILE',
    ENV: 'DEV',
  },

  ENV_UAT: {
    BASE_URL: 'https://uat.api.example.com/',
    SECRET_KEY: 'demo-secret-uat',
    PARTNER_CODE: 'DEMO_MOBILE',
    ENV: 'UAT',
  },

  // ENV_OLD: {
  //   BASE_URL: 'https://old.api.example.com/',
  // },

  ENV_PROD: {
    BASE_URL: 'https://api.example.com/',
    SECRET_KEY: 'demo-secret-prod',
    PARTNER_CODE: 'DEMO_MOBILE',
    ENV: 'PROD',
  },

  ENDPOINT: {
    EXECUTE: 'v1/execute', // mọi lời gọi nghiệp vụ
    LOGIN: 'v1/login', // đăng nhập
    REFRESH: 'v1/refresh', // cấp lại access token
    UPLOAD_FILE: 'v1/upload-file', // upload ảnh hồ sơ
  },

  ACTION_CODE: {
    LOGIN: 'DEMO_LOGIN', //đăng nhập
    CLAIM_LIST: 'DEMO_CLAIM_LIST', //danh sách hồ sơ bồi thường
    CLAIM_DETAIL: 'DEMO_CLAIM_DETAIL', //xem chi tiết 1 hồ sơ
    PHOTO_UPLOAD: 'DEMO_PHOTO_UPLOAD', //upload ảnh tổn thất
    CLAIM_FINISH: 'DEMO_CLAIM_FINISH', //kết thúc giám định
  },

  SERVER_MESSAGE: {
    TOKEN_EXPIRED: 'Token has expired.',
    SESSION_EXPIRED: 'Session has expired.',
    OTHER_DEVICE: 'Signed in on another device.',
  },
};
