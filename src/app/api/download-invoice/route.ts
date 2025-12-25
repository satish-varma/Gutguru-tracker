import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFromR2, isR2Configured } from "@/lib/r2";

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const pdfPath = searchParams.get('pdfPath');

        if (!id) {
            return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
        }

        const invoiceId = decodeURIComponent(id);
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || !session.user || !session.user.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Download] Requested ID: ${invoiceId}`);
        console.log(`[Download] PDF Path: ${pdfPath}`);

        let fileBuffer: Buffer | null = null;

        // Check if PDF is stored in R2
        if (pdfPath?.startsWith('r2://')) {
            if (!isR2Configured()) {
                return NextResponse.json(
                    { error: 'R2 storage not configured' },
                    { status: 500 }
                );
            }

            try {
                const r2Key = pdfPath.replace('r2://', '');
                console.log(`[Download] Fetching from R2: ${r2Key}`);
                fileBuffer = await getFromR2(r2Key);
                console.log(`[Download] Got ${fileBuffer.length} bytes from R2`);
            } catch (err) {
                console.error('[Download] Failed to fetch from R2:', err);
                return NextResponse.json(
                    { error: 'Failed to fetch PDF from storage' },
                    { status: 500 }
                );
            }
        } else {
            // Try local filesystem
            const filePath = path.join(process.cwd(), 'public', 'documents', `${invoiceId}.pdf`);
            console.log(`[Download] Checking local path: ${filePath}`);

            if (fs.existsSync(filePath)) {
                fileBuffer = fs.readFileSync(filePath);
                console.log(`[Download] Got ${fileBuffer.length} bytes from local file`);
            } else {
                // Try with the pdfPath directly
                if (pdfPath) {
                    const altPath = path.join(process.cwd(), 'public', pdfPath);
                    if (fs.existsSync(altPath)) {
                        fileBuffer = fs.readFileSync(altPath);
                        console.log(`[Download] Got ${fileBuffer.length} bytes from alt path`);
                    }
                }
            }
        }

        if (!fileBuffer) {
            console.error(`[Download] File not found for invoice: ${invoiceId}`);
            return NextResponse.json(
                { error: 'Invoice PDF not found. PDFs may not be available for invoices synced on serverless environments without R2 configured.' },
                { status: 404 }
            );
        }

        // Clean filename for download
        const cleanFilename = `${invoiceId.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${cleanFilename}"`,
                'Content-Length': fileBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error downloading invoice:', error);
        return NextResponse.json(
            { error: 'Failed to download invoice' },
            { status: 500 }
        );
    }
}
