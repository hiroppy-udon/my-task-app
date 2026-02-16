/**
 * 暗号化機能のテストコード
 * ブラウザのコンソールで動作確認する
 */

import {
    generateEncryptionKey,
    exportKey,
    importKey,
    encryptBlob,
    decryptToBlob
} from './utils/crypto';

async function testCrypto() {
    console.log('🧪 暗号化テスト開始...');

    try {
        // ステップ1: 鍵を生成
        console.log('1️⃣ 鍵を生成中...');
        const key = await generateEncryptionKey();
        console.log('✅ 鍵生成成功');

        // ステップ2: 鍵をエクスポート（文字列化）
        console.log('2️⃣ 鍵をエクスポート中...');
        const keyString = await exportKey(key);
        console.log('✅ 鍵エクスポート成功');
        console.log('   鍵（最初の50文字）:', keyString.substring(0, 50) + '...');

        // ステップ3: 鍵をインポート（復元）
        console.log('3️⃣ 鍵をインポート中...');
        const importedKey = await importKey(keyString);
        console.log('✅ 鍵インポート成功');

        // ステップ4: テスト用の音声データを作成
        console.log('4️⃣ テスト用データ作成中...');
        const testData = 'これはテスト用の音声データです';
        const testBlob = new Blob([testData], { type: 'audio/webm' });
        console.log('✅ テストデータ作成成功');
        console.log('   データ:', testData);

        // ステップ5: 暗号化
        console.log('5️⃣ 暗号化中...');
        const { encryptedData, iv } = await encryptBlob(testBlob, key);
        console.log('✅ 暗号化成功');
        console.log('   暗号化データ（最初の50文字）:', encryptedData.substring(0, 50) + '...');
        console.log('   IV（最初の20文字）:', iv.substring(0, 20) + '...');

        // ステップ6: 復号化
        console.log('6️⃣ 復号化中...');
        const decryptedBlob = await decryptToBlob(encryptedData, iv, key);
        console.log('✅ 復号化成功');

        // ステップ7: 元のデータと一致するか確認
        console.log('7️⃣ データ検証中...');
        const decryptedText = await decryptedBlob.text();

        if (decryptedText === testData) {
            console.log('🎉 検証成功！元のデータと一致しました');
            console.log('   元のデータ:', testData);
            console.log('   復号化データ:', decryptedText);
        } else {
            console.error('❌ 検証失敗！データが一致しません');
            console.log('   元のデータ:', testData);
            console.log('   復号化データ:', decryptedText);
        }

        console.log('\n✨ すべてのテスト完了 ✨');

    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
    }
}

// ページ読み込み時に自動実行
if (typeof window !== 'undefined') {
    console.log('暗号化テストを実行します...');
    testCrypto();
}

export { testCrypto };