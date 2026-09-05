import { CryptoUtil } from './crypto';

describe('CryptoUtil - Envelope Encryption', () => {
  const masterKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  test('should generate a 32-byte DEK', () => {
    const dek = CryptoUtil.generateDEK();
    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
  });

  test('should correctly wrap and unwrap DEK using Master KEK', () => {
    const dek = CryptoUtil.generateDEK();
    const { encryptedDekHex, dekIvHex, dekAuthTagHex } = CryptoUtil.wrapDEK(dek, masterKeyHex);

    expect(encryptedDekHex).toBeDefined();
    expect(dekIvHex).toBeDefined();
    expect(dekAuthTagHex).toBeDefined();

    const unwrappedDek = CryptoUtil.unwrapDEK(encryptedDekHex, dekIvHex, dekAuthTagHex, masterKeyHex);
    expect(unwrappedDek.equals(dek)).toBe(true);
  });

  test('should encrypt and decrypt a file payload producing byte-for-byte equality', () => {
    const rawPayload = Buffer.from('Confidential Document Content: Top Secret Data 2026!');
    const envelope = CryptoUtil.encryptFileWithEnvelope(rawPayload, masterKeyHex);

    expect(envelope.encryptedBuffer).not.toEqual(rawPayload);
    expect(envelope.checksumSha256).toBeDefined();

    const decryptedPayload = CryptoUtil.decryptFileWithEnvelope(
      envelope.encryptedBuffer,
      envelope.encryptedDek,
      envelope.iv,
      envelope.authTag,
      masterKeyHex
    );

    expect(decryptedPayload.toString('utf-8')).toBe('Confidential Document Content: Top Secret Data 2026!');
  });

  test('should fail decryption if payload or authTag is tampered', () => {
    const rawPayload = Buffer.from('Sensitive payload');
    const envelope = CryptoUtil.encryptFileWithEnvelope(rawPayload, masterKeyHex);

    // Tamper payload
    envelope.encryptedBuffer[0] ^= 0xff;

    expect(() => {
      CryptoUtil.decryptFileWithEnvelope(
        envelope.encryptedBuffer,
        envelope.encryptedDek,
        envelope.iv,
        envelope.authTag,
        masterKeyHex
      );
    }).toThrow();
  });
});
