import { env } from '../../config/env';
import { IStorageProvider } from './IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

export function getStorageProvider(): IStorageProvider {
  if (env.STORAGE_PROVIDER === 's3') {
    throw new Error('S3 storage is not implemented; set STORAGE_PROVIDER=local.');
  }
  return new LocalStorageProvider();
}
