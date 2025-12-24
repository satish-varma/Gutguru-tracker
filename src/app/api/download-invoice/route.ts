import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
        }

        const invoiceId = decodeURIComponent(id);
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || !session.user || !session.user.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Construct path to the stored PDF
        // In sync.ts: path.join(process.cwd(), 'public', 'documents', `${uniqueId}.pdf`);
        const filePath = path.join(process.cwd(), 'public', 'documents', `${invoiceId}.pdf`);

        console.log(`[Download] Requested ID: ${invoiceId}`);
        console.log(`[Download] Resolved Path: ${filePath}`);
        console.log(`[Download] File Exists? ${fs.existsSync(filePath)}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`[Download] File not found: ${filePath}`);

            // Debug: List files in directory to see what IS there
            const dir = path.dirname(filePath);
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                console.log(`[Download] Files in ${dir}:`, files.slice(0, 5)); // Show first 5 matches
            }

            return NextResponse.json(
                { error: 'Invoice file not found on server', path: filePath },
                { status: 404 }
            );
        }

        const fileBuffer = fs.readFileSync(filePath);

        // Clean filename to ensure it's safe for headers
        const cleanFilename = (invoiceId.endsWith('.pdf') ? invoiceId : `${invoiceId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="Invoice.pdf"',
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
