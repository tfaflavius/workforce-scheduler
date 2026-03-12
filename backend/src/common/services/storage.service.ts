import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const provider = this.configService.get('STORAGE_PROVIDER');
    const endpoint = this.configService.get('MINIO_ENDPOINT');

    this.bucket = this.configService.get('AWS_S3_BUCKET');

    if (provider === 'minio') {
      // Configure for MinIO
      this.s3 = new S3Client({
        endpoint,
        region: 'us-east-1',
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        },
        forcePathStyle: true, // Required for MinIO
      });
    } else {
      // Configure for AWS S3
      this.s3 = new S3Client({
        region: this.configService.get('AWS_S3_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
  }

  /**
   * Upload a file to storage
   * @param folder - Folder/prefix in the bucket
   * @param fileName - Name of the file
   * @param buffer - File buffer
   * @param contentType - MIME type
   * @returns Presigned URL to access the file (24h expiry)
   */
  async upload(
    folder: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      await this.ensureBucketExists();

      const key = `${folder}/${fileName}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      // Generate presigned URL that expires in 24 hours
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 24 * 60 * 60 },
      );

      return url;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  /**
   * Download a file from storage
   * @param key - Full key path in bucket
   * @returns File buffer
   */
  async download(key: string): Promise<Buffer> {
    try {
      const result = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      // Convert readable stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to download file: ${error.message}`,
      );
    }
  }

  /**
   * Delete a file from storage
   * @param key - Full key path in bucket
   */
  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }

  /**
   * Check if file exists
   * @param key - Full key path in bucket
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3.send(
        new HeadBucketCommand({ Bucket: this.bucket }),
      );
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        await this.s3.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
      } else {
        throw error;
      }
    }
  }
}
