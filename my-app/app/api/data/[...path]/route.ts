import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join('/');
    // Access data from public folder
    const fullPath = join(process.cwd(), 'public', 'Finalized Data', filePath);
    
    // Security: prevent directory traversal
    const resolvedPath = join(process.cwd(), 'public', 'Finalized Data', ...path);
    const finalizedDataRoot = join(process.cwd(), 'public', 'Finalized Data');
    if (!resolvedPath.startsWith(finalizedDataRoot)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }
    
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }
    
    try {
      const fileContent = await readFile(fullPath, 'utf-8');
      
      // Determine content type based on file extension
      const contentType = fullPath.endsWith('.json') || fullPath.endsWith('.geojson')
        ? 'application/json'
        : 'application/octet-stream';
      
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return NextResponse.json(
        { error: 'Failed to read file', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in serve_finalized_data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
