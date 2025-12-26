from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import base64
import os
from pydub import AudioSegment
from infer_rvc import RVCInfer
import qrcode

def show_qr(url):
    qr = qrcode.QRCode()
    # スマホがアクセスした瞬間にURLを設定するパラメータを付与
    target_url = f"https://your-web-app-url.pages.dev/?url={url}" 
    qr.add_data(target_url)
    qr.print_ascii()
    print(f"\nスマホでスキャンしてください: {target_url}")

# トンネル起動後、表示されたURLをこの関数に渡すとターミナルにQRが出ます

app = FastAPI()

# Reactからの接続を許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# パス設定
MODEL_PATH = "models/zundamon.pth"
INDEX_PATH = "models/zundamon.index"
HUBERT_PATH = "hubert_base.pt"

# サーバー起動時にAIエンジンをロード
#rvc_engine = RVCInfer(MODEL_PATH, HUBERT_PATH)
# main.py の24行目付近
rvc_engine = RVCInfer(MODEL_PATH, INDEX_PATH) # HUBERT_PATHの代わりにINDEX_PATHを渡す

@app.post("/convert")
async def convert_voice(file: UploadFile = File(...)):
    temp_input = "input_voice.mp4"
    temp_wav = "input_ready.wav"
    temp_output = "output_zunda.wav"
    
    with open(temp_input, "wb") as f:
        f.write(await file.read())
    
    try:
        # 1. mp4をAIが処理しやすいWAV(40kHz)に変換
        audio = AudioSegment.from_file(temp_input)
        audio = audio.set_frame_rate(40000).set_channels(1)
        audio.export(temp_wav, format="wav")
        
        # 2. RVC推論を実行（男声ならf0_up_key=12で1オクターブ上げ）
        success = rvc_engine.convert(temp_wav, temp_output, f0_up_key=12)
        
        if not success:
            return {"error": "AI conversion failed"}

        # 3. 変換後の音声をBase64で返却
        with open(temp_output, "rb") as f:
            encoded_audio = base64.b64encode(f.read()).decode('utf-8')
            
        return {"zundaVoice": f"data:audio/wav;base64,{encoded_audio}"}

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}
        
    finally:
        # 一時ファイルの削除
        for p in [temp_input, temp_wav, temp_output]:
            if os.path.exists(p):
                os.remove(p)

if __name__ == "__main__":
    import uvicorn
    
    print("1. FrontendのTunnel URLを入力してください:")
    f_url = input("> ").strip()
    
    print("2. BackendのTunnel URLを入力してください:")
    b_url = input("> ").strip()
    
    if f_url and b_url:
        # Frontend URLにパラメータとしてBackend URLを付与
        sync_url = f"{f_url}/?url={b_url}"
        
        qr = qrcode.QRCode(box_size=1)
        qr.add_data(sync_url)
        qr.print_ascii()
        print(f"\nスマホでスキャン: {sync_url}")
        
    uvicorn.run(app, host="0.0.0.0", port=8000)