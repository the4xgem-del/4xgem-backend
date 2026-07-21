import AWS from "aws-sdk";
import { env } from "@/config/env";

/**
 * `null` when S3 isn't configured, so the app still runs without real
 * storage credentials — the avatar upload route checks for this and
 * returns a clear 503 instead of crashing.
 */
export const s3: AWS.S3 | null = env.S3_ACCESS_KEY_ID
  ? new AWS.S3({
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      endpoint: env.S3_ENDPOINT || undefined,
      region: env.S3_REGION,
      s3ForcePathStyle: Boolean(env.S3_ENDPOINT), // required for R2/MinIO-style endpoints
    })
  : null;

export async function uploadToS3(params: { key: string; body: Buffer; contentType: string }): Promise<string> {
  if (!s3) throw new Error("S3 is not configured");
  await s3
    .putObject({
      Bucket: env.S3_BUCKET!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: "public-read",
    })
    .promise();

  const base = env.S3_ENDPOINT
    ? `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}`
    : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
  return `${base}/${params.key}`;
}
