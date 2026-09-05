import { env } from '../../config/env';
import { IStorageProvider } from './IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

export function getStorageProvider(): IStorageProvider {
  if (env.STORAGE_PROVIDER === 's3') {
    // S3 provider can be hooked up here
    return new LocalStorageProvider();
  }
  return new LocalStorageProvider();
}
