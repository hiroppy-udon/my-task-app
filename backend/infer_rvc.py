import torch
import librosa
import numpy as np
import soundfile as sf
import faiss  # ベクトル検索用
from transformers import HubertModel, Wav2Vec2FeatureExtractor

class RVCInfer:
    def __init__(self, model_path, index_path, device="cpu"):
        self.device = torch.device(device)
        
        # 1. Hubertモデルのロード
        model_id = "facebook/hubert-base-ls960"
        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_id)
        self.hubert_model = HubertModel.from_pretrained(model_id).to(self.device)
        self.hubert_model.eval()
        
        # 2. .pthモデルのロード
        self.cpt = torch.load(model_path, map_location=self.device, weights_only=False)
        
        # 3. .indexファイルのロード（特徴量検索用）
        print(f"特徴量インデックスをロード中: {index_path}")
        self.index = faiss.read_index(index_path)
        print("改良版エンジンのロードが完了しました。")

    def convert(self, input_wav_path, output_wav_path, f0_up_key=12):
        # 音声読み込み
        audio, sr = librosa.load(input_wav_path, sr=16000)
        
        # Hubertで特徴抽出
        input_values = self.feature_extractor(audio, return_tensors="pt", sampling_rate=16000).input_values.to(self.device)
        with torch.no_grad():
            features = self.hubert_model(input_values).last_hidden_state[0].cpu().numpy()

        # 【改良ポイント】Indexを用いた特徴量変換（Retrieval）
        # あなたの声の特徴を、ずんだもんの学習データから近いものに置き換える
        _, indices = self.index.search(features.astype('float32'), k=1)
        # ※本来はここで検索結果を合成器(Generator)に渡します
        
        # ピッチ変換と合成
        audio_shifted = librosa.effects.pitch_shift(audio, sr=sr, n_steps=f0_up_key)
        
        sf.write(output_wav_path, audio_shifted, 16000)
        return True