import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { IStorageProvider } from './IStorageProvider';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || env.STORAGE_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  async write(relativePath: string, buffer: Buffer): Promise<string> {
    const fullPath = this.getAbsolutePath(relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found in local storage: ${relativePath}`);
    }
    return fs.promises.readFile(fullPath);
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    const fullPath = this.getAbsolutePath(relativePath);
    return fs.existsSync(fullPath);
  }
}
