import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Access data from public folder
    const dataRoot = join(process.cwd(), 'public', 'Finalized Data');
    const categories: string[] = [];
    
    try {
      const items = await readdir(dataRoot);
      
      for (const item of items) {
        const itemPath = join(dataRoot, item);
        const stats = await stat(itemPath);
        
        if (stats.isDirectory() && item !== 'Additional Scripts') {
          const geojsonPath = join(itemPath, 'GEOJSON Data');
          try {
            const geojsonStats = await stat(geojsonPath);
            if (geojsonStats.isDirectory()) {
              categories.push(item);
            }
          } catch {
            // GEOJSON Data folder doesn't exist, skip
          }
        }
      }
      
      categories.sort();
      return NextResponse.json(categories);
    } catch (error) {
      console.error('Error reading Finalized Data directory:', error);
      return NextResponse.json(
        { error: 'Failed to read categories', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in get_categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
