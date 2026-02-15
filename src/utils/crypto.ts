/**
 * 暗号化ユーティリティ
 * AES-GCM暗号を使用した音声データの暗号化・復号化
 */

/**
 * AES-GCM暗号化鍵を生成
 * @returns 暗号化・復号化に使用する鍵
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',        // 暗号化アルゴリズム（認証付き暗号）
            length: 256,            // 鍵の長さ（256bit = 高セキュリティ）
        },
        true,                     // 鍵のエクスポート可能（保存するため）
        ['encrypt', 'decrypt']    // この鍵でできる操作
    );
}

/**
 * 鍵をエクスポート（保存用に文字列化）
 * @param key - エクスポートする鍵
 * @returns JSON形式の鍵文字列
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
}

/**
 * 鍵をインポート（文字列から鍵を復元）
 * @param keyData - JSON形式の鍵文字列
 * @returns 復元された鍵
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyData);
    return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * データを暗号化
 * @param data - 暗号化するデータ（ArrayBuffer形式）
 * @param key - 暗号化鍵
 * @returns 暗号化されたデータとIV（初期化ベクトル）
 */
export async function encryptData(
    data: ArrayBuffer,
    key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    // IV（初期化ベクトル）を生成
    // 毎回異なる値を使うことで、同じデータでも暗号化結果が変わる（セキュリティ向上）
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    // 暗号化実行
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv as BufferSource,
        },
        key,
        data
    );

    return { encrypted, iv };
}

/**
 * データを復号化
 * @param encryptedData - 暗号化されたデータ
 * @param key - 復号化鍵（暗号化時と同じ鍵）
 * @param iv - 初期化ベクトル（暗号化時に使ったもの）
 * @returns 復号化された元のデータ
 */
export async function decryptData(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv as BufferSource,
        },
        key,
        encryptedData
    );
}

/**
 * Blobを暗号化してBase64文字列に変換
 * （localStorageに保存するため文字列化が必要）
 * @param blob - 暗号化する音声データ（Blob形式）
 * @param key - 暗号化鍵
 * @returns Base64エンコードされた暗号化データとIV
 */
export async function encryptBlob(
    blob: Blob,
    key: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
    // BlobをArrayBufferに変換
    const arrayBuffer = await blob.arrayBuffer();

    // 暗号化
    const { encrypted, iv } = await encryptData(arrayBuffer, key);

    // Base64エンコード（localStorageに保存するため）
    const encryptedData = arrayBufferToBase64(encrypted);
    const ivString = arrayBufferToBase64(iv.buffer as ArrayBuffer);

    return { encryptedData, iv: ivString };
}

/**
 * 暗号化されたデータを復号化してBlobに変換
 * @param encryptedData - Base64エンコードされた暗号化データ
 * @param ivString - Base64エンコードされたIV
 * @param key - 復号化鍵
 * @param mimeType - データのMIMEタイプ（デフォルト: audio/webm）
 * @returns 復号化された音声データ（Blob形式）
 */
export async function decryptToBlob(
    encryptedData: string,
    ivString: string,
    key: CryptoKey,
    mimeType: string = 'audio/webm'
): Promise<Blob> {
    // Base64デコード
    const encrypted = base64ToArrayBuffer(encryptedData);
    const iv = base64ToArrayBuffer(ivString);

    // 復号化
    const decrypted = await decryptData(encrypted, key, new Uint8Array(iv));

    // Blobに変換
    return new Blob([decrypted], { type: mimeType });
}

// ========================================
// ヘルパー関数（内部使用）
// ========================================

/**
 * ArrayBufferをBase64文字列に変換
 * @param buffer - 変換するArrayBuffer
 * @returns Base64文字列
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Base64文字列をArrayBufferに変換
 * @param base64 - 変換するBase64文字列
 * @returns ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}