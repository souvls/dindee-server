import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const uploadFileToS3 = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `dindee/${folder}/${uuidv4()}${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: "public-read", // Ensure bucket policy allows public read if needed, or remove if strictly private/presigned
  });

  await s3Client.send(command);

  // Return the public URL (assuming public bucket access or CloudFront)
  // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "ap-southeast-1";

  return `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
};
