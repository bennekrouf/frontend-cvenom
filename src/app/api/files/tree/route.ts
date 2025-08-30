import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface FileTreeItem {
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: Record<string, FileTreeItem>;
}

async function buildFileTree(dirPath: string, basePath: string = ''): Promise<Record<string, FileTreeItem>> {
  try {
    const items = await readdir(dirPath);
    const tree: Record<string, FileTreeItem> = {};

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        tree[item] = {
          type: 'folder',
          children: await buildFileTree(fullPath, relativePath)
        };
      } else {
        // Only include .typ and .toml files
        if (item.endsWith('.typ') || item.endsWith('.toml')) {
          tree[item] = {
            type: 'file',
            size: stats.size,
            modified: stats.mtime
          };
        }
      }
    }

    return tree;
  } catch (error) {
    console.error('Error building file tree:', error);
    return {};
  }
}

export async function GET() {
  try {
    const dataPath = join(process.cwd(), '../cvfinder-backend/data');
    const fileTree = await buildFileTree(dataPath);
    
    return NextResponse.json(fileTree);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load file tree' },
      { status: 500 }
    );
  }
}
