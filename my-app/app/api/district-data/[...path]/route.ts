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
    
    // Check multiple possible locations for District Data
    const possiblePaths = [
      join(process.cwd(), 'public', 'District Data', filePath),
      join(process.cwd(), '..', 'Visualization', 'District Data', filePath),
      join(process.cwd(), '..', 'District Data', filePath)
    ];
    
    let fullPath: string | null = null;
    let districtDataRoot: string | null = null;
    
    for (const testPath of possiblePaths) {
      if (existsSync(testPath)) {
        fullPath = testPath;
        // Find the root directory
        if (testPath.includes('public')) {
          districtDataRoot = join(process.cwd(), 'public', 'District Data');
        } else if (testPath.includes('Visualization')) {
          districtDataRoot = join(process.cwd(), '..', 'Visualization', 'District Data');
        } else {
          districtDataRoot = join(process.cwd(), '..', 'District Data');
        }
        break;
      }
    }
    
    if (!fullPath || !districtDataRoot) {
      return NextResponse.json(
        { error: `District Data folder not found. Checked: public/District Data, ../Visualization/District Data, ../District Data` },
        { status: 404 }
      );
    }
    
    // Security: prevent directory traversal
    const resolvedPath = join(districtDataRoot, ...path);
    if (!resolvedPath.startsWith(districtDataRoot)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }
    
    if (!existsSync(fullPath)) {
      // List available files for debugging
      let availableFiles: string[] = [];
      try {
        const { readdir } = await import('fs/promises');
        availableFiles = await readdir(districtDataRoot);
      } catch {
        // Ignore error
      }
      
      return NextResponse.json(
        {
          error: `File not found: ${filePath}`,
          available_files: availableFiles,
        },
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
    console.error('Error in serve_district_data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
