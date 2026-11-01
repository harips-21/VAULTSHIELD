import { env } from '../../config/env';
import { getStorageProvider } from './storageFactory';
import { LocalStorageProvider } from './LocalStorageProvider';

jest.mock('../../config/env', () => ({
  env: { STORAGE_PROVIDER: 'local' },
}));

jest.mock('./LocalStorageProvider', () => ({
  LocalStorageProvider: jest.fn(),
}));

describe('getStorageProvider', () => {
  test('returns the configured local provider', () => {
    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  test('fails explicitly when S3 is configured but unavailable', () => {
    env.STORAGE_PROVIDER = 's3';

    expect(() => getStorageProvider()).toThrow('S3 storage is not implemented');
  });
});
