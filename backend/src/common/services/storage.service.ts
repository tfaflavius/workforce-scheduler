import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class StorageService {
  private s3: AWS.S3;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const provider = this.configService.get('STORAGE_PROVIDER');
    const endpoint = this.configService.get('MINIO_ENDPOINT');

    this.bucket = this.configService.get('AWS_S3_BUCKET');

    if (provider === 'minio') {
      // Configure for MinIO
      this.s3 = new AWS.S3({
        endpoint,
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        s3ForcePathStyle: true, // Required for MinIO
        signatureVersion: 'v4',
      });
    } else {
      // Configure for AWS S3
      this.s3 = new AWS.S3({
        region: this.configService.get('AWS_S3_REGION', 'us-east-1'),
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      });
    }
  }

  /**
   * Upload a file to storage
   * @param folder - Folder/prefix in the bucket
   * @param fileName - Name of the file
   * @param buffer - File buffer
   * @param contentType - MIME type
   * @returns Public URL to access the file
   */
  async upload(
    folder: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      // Ensure bucket exists
      await this.ensureBucketExists();

      const key = `${folder}/${fileName}`;

      await this.s3
        .putObject({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
        .promise();

      // Generate presigned URL that expires in 24 hours
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: 24 * 60 * 60, // 24 hours
      });

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
      const result = await this.s3
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      return result.Body as Buffer;
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
      await this.s3
        .deleteObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
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
      await this.s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
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
      await this.s3
        .headBucket({
          Bucket: this.bucket,
        })
        .promise();
    } catch (error) {
      if (error.code === 'NotFound') {
        // Bucket doesn't exist, create it
        await this.s3
          .createBucket({
            Bucket: this.bucket,
          })
          .promise();
      } else {
        throw error;
      }
    }
  }
}
