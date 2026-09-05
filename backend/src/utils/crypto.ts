import crypto from 'crypto';

export interface EnvelopeEncryptionResult {
  encryptedBuffer: Buffer;
  encryptedDekHex: string;
  ivHex: string;
  authTagHex: string;
  checksumSha256: string;
}

export class CryptoUtil {
  /**
   * Generates a random 256-bit (32-byte) Data Encryption Key (DEK)
   */
  static generateDEK(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Wraps (encrypts) a per-file DEK using the Master KEK (Key Encryption Key)
   */
  static wrapDEK(dek: Buffer, masterKeyHex: string): { encryptedDekHex: string; dekIvHex: string; dekAuthTagHex: string } {
    const masterKey = Buffer.from(masterKeyHex, 'hex');
    if (masterKey.length !== 32) {
      throw new Error('Master key must be exactly 32 bytes (64 hex characters)');
    }

    const dekIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, dekIv);
    const encryptedDek = Buffer.concat([cipher.update(dek), cipher.final()]);
    const dekAuthTag = cipher.getAuthTag();

    return {
      encryptedDekHex: encryptedDek.toString('hex'),
      dekIvHex: dekIv.toString('hex'),
      dekAuthTagHex: dekAuthTag.toString('hex'),
    };
  }

  /**
   * Unwraps (decrypts) a per-file DEK using the Master KEK
   */
  static unwrapDEK(
    encryptedDekHex: string,
    dekIvHex: string,
    dekAuthTagHex: string,
    masterKeyHex: string
  ): Buffer {
    const masterKey = Buffer.from(masterKeyHex, 'hex');
    const dekIv = Buffer.from(dekIvHex, 'hex');
    const encryptedDek = Buffer.from(encryptedDekHex, 'hex');
    const dekAuthTag = Buffer.from(dekAuthTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, dekIv);
    decipher.setAuthTag(dekAuthTag);

    return Buffer.concat([decipher.update(encryptedDek), decipher.final()]);
  }

  /**
   * Encrypts a raw file payload with a per-file DEK using AES-256-GCM
   */
  static encryptPayload(payload: Buffer, dek: Buffer, masterKeyHex: string): EnvelopeEncryptionResult {
    const fileIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, fileIv);
    const encryptedBuffer = Buffer.concat([cipher.update(payload), cipher.final()]);
    const fileAuthTag = cipher.getAuthTag();

    // Wrap the DEK with KEK
    const { encryptedDekHex } = this.wrapDEK(dek, masterKeyHex);

    // Calculate SHA-256 checksum of original unencrypted payload
    const checksumSha256 = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      encryptedBuffer,
      encryptedDekHex,
      ivHex: fileIv.toString('hex'),
      authTagHex: fileAuthTag.toString('hex'),
      checksumSha256,
    };
  }

  /**
   * Decrypts an encrypted file payload using wrapped DEK + KEK + file IV + GCM Auth Tag
   */
  static decryptPayload(
    encryptedBuffer: Buffer,
    encryptedDekHex: string,
    fileIvHex: string,
    fileAuthTagHex: string,
    masterKeyHex: string
  ): Buffer {
    // Unwrap the DEK first using the KEK (in this simplified envelope, encryptedDekHex was derived with Master Key)
    // For robust storage, we unwrap DEK:
    const dek = this.unwrapDEK(encryptedDekHex, fileIvHex.slice(0, 24), fileAuthTagHex.slice(0, 32), masterKeyHex);

    const fileIv = Buffer.from(fileIvHex, 'hex');
    const fileAuthTag = Buffer.from(fileAuthTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, fileIv);
    decipher.setAuthTag(fileAuthTag);

    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }

  /**
   * Helper: Directly encrypt payload with generated DEK and return unwrapped DEK + wrapped DEK info
   */
  static encryptFileWithEnvelope(payload: Buffer, masterKeyHex: string) {
    const dek = this.generateDEK();
    const fileIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, fileIv);
    const encryptedBuffer = Buffer.concat([cipher.update(payload), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const { encryptedDekHex, dekIvHex, dekAuthTagHex } = this.wrapDEK(dek, masterKeyHex);
    const checksumSha256 = crypto.createHash('sha256').update(payload).digest('hex');

    // Combine dek metadata for database storage
    const combinedEncryptedDek = JSON.stringify({
      dek: encryptedDekHex,
      div: dekIvHex,
      dtag: dekAuthTagHex,
    });

    return {
      encryptedBuffer,
      encryptedDek: combinedEncryptedDek,
      iv: fileIv.toString('hex'),
      authTag: authTag.toString('hex'),
      checksumSha256,
    };
  }

  /**
   * Helper: Directly decrypt payload using stored envelope parameters
   */
  static decryptFileWithEnvelope(
    encryptedBuffer: Buffer,
    encryptedDekJson: string,
    fileIvHex: string,
    fileAuthTagHex: string,
    masterKeyHex: string
  ): Buffer {
    const { dek: encryptedDekHex, div: dekIvHex, dtag: dekAuthTagHex } = JSON.parse(encryptedDekJson);
    const dek = this.unwrapDEK(encryptedDekHex, dekIvHex, dekAuthTagHex, masterKeyHex);

    const fileIv = Buffer.from(fileIvHex, 'hex');
    const fileAuthTag = Buffer.from(fileAuthTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, fileIv);
    decipher.setAuthTag(fileAuthTag);

    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }
}
