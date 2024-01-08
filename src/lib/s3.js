import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});

const EXPIRES_IN_3_DAYS = 3600 * 24 * 3;

export const uploadFileToS3 = async ({
  key,
  file,
  contentType = 'video/mp4',
  bucketName,
}) => {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });

  const result = await upload.done();
  return result;
};

export const getSignedDownloadUrl = async ({ bucketName, key }) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(client, command, {
    // expires after 3 days
    expiresIn: EXPIRES_IN_3_DAYS,
  });

  return signedUrl;
};
