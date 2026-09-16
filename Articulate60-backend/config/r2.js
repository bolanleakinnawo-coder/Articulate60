const { S3Client } = require("@aws-sdk/client-s3");

// R2 is S3-compatible, so we just point the AWS SDK at Cloudflare's
// endpoint instead of Amazon's. Everything else about the SDK works
// the same way.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

module.exports = r2;