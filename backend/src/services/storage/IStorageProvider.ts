export interface IStorageProvider {
  /**
   * Saves an encrypted file payload to storage
   * @returns Storage path or S3 key
   */
  write(relativePath: string, buffer: Buffer): Promise<string>;

  /**
   * Reads an encrypted file payload from storage
   */
  read(relativePath: string): Promise<Buffer>;

  /**
   * Deletes an object from storage
   */
  delete(relativePath: string): Promise<void>;

  /**
   * Checks if object exists in storage
   */
  exists(relativePath: string): Promise<boolean>;
}
