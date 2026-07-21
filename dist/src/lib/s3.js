"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3 = void 0;
exports.uploadToS3 = uploadToS3;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const env_1 = require("../config/env");
/**
 * `null` when S3 isn't configured, so the app still runs without real
 * storage credentials — the avatar upload route checks for this and
 * returns a clear 503 instead of crashing.
 */
exports.s3 = env_1.env.S3_ACCESS_KEY_ID
    ? new aws_sdk_1.default.S3({
        accessKeyId: env_1.env.S3_ACCESS_KEY_ID,
        secretAccessKey: env_1.env.S3_SECRET_ACCESS_KEY,
        endpoint: env_1.env.S3_ENDPOINT || undefined,
        region: env_1.env.S3_REGION,
        s3ForcePathStyle: Boolean(env_1.env.S3_ENDPOINT), // required for R2/MinIO-style endpoints
    })
    : null;
async function uploadToS3(params) {
    if (!exports.s3)
        throw new Error("S3 is not configured");
    await exports.s3
        .putObject({
        Bucket: env_1.env.S3_BUCKET,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        ACL: "public-read",
    })
        .promise();
    const base = env_1.env.S3_ENDPOINT
        ? `${env_1.env.S3_ENDPOINT.replace(/\/$/, "")}/${env_1.env.S3_BUCKET}`
        : `https://${env_1.env.S3_BUCKET}.s3.${env_1.env.S3_REGION}.amazonaws.com`;
    return `${base}/${params.key}`;
}
//# sourceMappingURL=s3.js.map