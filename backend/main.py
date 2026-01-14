from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import base64
import os
import json
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

DB_FILE = "database.json"

@app.post("/sync")
async def sync_data(request: Request):
    try:
        client_data = await request.json()
        
        server_data = []
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        server_data = json.load(f)
            except Exception as e:
                print(f"Load Error: {e}")
                server_data = []

        # Merge Logic: Client + Server
        # IDをキーにした辞書を作成
        server_map = {item["id"]: item for item in server_data}
        
        for client_item in client_data:
            c_id = client_item.get("id")
            if not c_id: continue
            
            if c_id in server_map:
                # 既存データ：ログを統合（和集合）
                s_item = server_map[c_id]
                
                # logs
                c_logs = client_item.get("logs", [])
                s_logs = s_item.get("logs", [])
                merged_logs = list(set(c_logs + s_logs))
                
                # failureLogs
                c_fails = client_item.get("failureLogs", [])
                s_fails = s_item.get("failureLogs", [])
                merged_fails = list(set(c_fails + s_fails))
                
                # 他のフィールドはクライアントを優先（メタデータ更新のため）
                s_item.update(client_item)
                # 統合したログを再セット
                s_item["logs"] = merged_logs
                s_item["failureLogs"] = merged_fails
            else:
                # 新規データ
                server_map[c_id] = client_item
        
        # マージ結果をリストに戻す
        final_data = list(server_map.values())
        
        # 保存
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
            
        return final_data
    except Exception as e:
        print(f"Sync Error: {e}")
        return {"error": str(e)}

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