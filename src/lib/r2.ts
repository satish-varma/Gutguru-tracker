import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 uses S3-compatible API
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'thegutguru-invoices';

// Check if R2 is configured
export function isR2Configured(): boolean {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Create R2 client
function getR2Client() {
    if (!isR2Configured()) {
        throw new Error('Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID!,
            secretAccessKey: R2_SECRET_ACCESS_KEY!,
        },
    });
}

/**
 * Upload a PDF file to Cloudflare R2
 * @param key - The file key (e.g., "invoices/INV-123.pdf")
 * @param data - The file data as Buffer
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(key: string, data: Buffer): Promise<string> {
    const client = getR2Client();

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: data,
        ContentType: 'application/pdf',
    });

    await client.send(command);
    console.log(`[R2] Uploaded: ${key}`);

    // Return the key for later retrieval
    return key;
}

/**
 * Get a signed URL for downloading a file from R2
 * @param key - The file key
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Signed URL for downloading
 */
export async function getR2SignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const client = getR2Client();

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
}

/**
 * Get file data from R2
 * @param key - The file key
 * @returns The file data as Buffer
 */
export async function getFromR2(key: string): Promise<Buffer> {
    const client = getR2Client();

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
        throw new Error('File not found in R2');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    // @ts-ignore - Body is a readable stream
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Delete a file from R2
 * @param key - The file key
 */
export async function deleteFromR2(key: string): Promise<void> {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    await client.send(command);
    console.log(`[R2] Deleted: ${key}`);
}

/**
 * Generate a unique key for an invoice PDF
 * @param invoiceId - The invoice ID
 * @returns The file key
 */
export function getInvoicePdfKey(invoiceId: string): string {
    return `invoices/${invoiceId}.pdf`;
}
