import { useState, useEffect, useRef } from 'react';
import './App.css';
import { Tooltip } from 'react-tooltip';
import { supabase, dbToGoal, goalToDb } from './lib/supabase.js';

function App() {
  // --- 1. データの初期化 ---
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('CONTRACT_BRIGHT_V2');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState('home');
  const [editingGoal, setEditingGoal] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [analyticsGoal, setAnalyticsGoal] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    localStorage.setItem('CONTRACT_BRIGHT_V2', JSON.stringify(goals));
  }, [goals]);

  // マウント時にSupabaseからデータを読み込み、localStorageとマージ
  useEffect(() => {
    const loadFromSupabase = async () => {
      const { data, error } = await supabase.from('goals').select('*');
      if (error) { console.error('Supabase load error', error); return; }
      if (!data || data.length === 0) return;

      const serverGoals = data.map(dbToGoal);
      setGoals(prev => {
        const serverMap = Object.fromEntries(serverGoals.map(g => [g.id, g]));
        const merged = prev.map(localGoal => {
          const serverGoal = serverMap[localGoal.id];
          if (serverGoal) {
            delete serverMap[localGoal.id];
            return {
              ...localGoal,
              logs: [...new Set([...localGoal.logs, ...serverGoal.logs])],
              failureLogs: [...new Set([...(localGoal.failureLogs || []), ...(serverGoal.failureLogs || [])])],
            };
          }
          return localGoal;
        });
        Object.values(serverMap).forEach(g => merged.push(g));
        return merged;
      });
    };
    loadFromSupabase();
  }, []);

  // goalsが変化したらSupabaseへ同期（2秒デバウンス）
  useEffect(() => {
    const sync = async () => {
      const rows = goals.map(goalToDb);
      const { error } = await supabase.from('goals').upsert(rows, { onConflict: 'id' });
      if (error) console.error('Supabase sync error', error);
    };
    const timer = setTimeout(sync, 2000);
    return () => clearTimeout(timer);
  }, [goals]);

  const playAudio = (e, voiceData) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!voiceData) {
      alert("音声データが存在しません。");
      return;
    }
    const audio = new Audio(voiceData);
    setIsPlaying(true);
    audio.play().catch(e => {
      console.error(e);
      setIsPlaying(false);
    });
    audio.onended = () => setIsPlaying(false);
  };

  const executeDelete = () => {
    setGoals(goals.filter(g => g.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const startNewSetup = () => {
    setEditingGoal({
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      title: '', reason: '', deadline: '', risk: '', reward: '',
      isSigned: false, voiceData: null, logs: []
    });
    setActiveTab('setup');
  };

  const finalizeContract = () => {
    setGoals([{ ...editingGoal, isSigned: true }, ...goals]);
    setEditingGoal(null);
    setShowConfirm(false);
    setActiveTab('home');
  };

  const [resultPendingGoalId, setResultPendingGoalId] = useState(null);

  const handleDailyResult = (goalId, isSuccess) => {
    const today = new Date().toISOString().split('T')[0];
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        if (isSuccess) {
          if (g.logs.includes(today)) return g;
          return { ...g, logs: [...g.logs, today] };
        } else {
          // Failure case
          const currentFailures = g.failureLogs || [];
          if (currentFailures.includes(today)) return g;
          return { ...g, failureLogs: [...currentFailures, today] };
        }
      }
      return g;
    }));
    setResultPendingGoalId(null);
  };

  // --- 3. 録音機能 ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const handleRecord = async () => {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => audioChunks.current.push(event.data);

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/mp4' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setEditingGoal(prev => ({ ...prev, voiceData: reader.result }));
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } else {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="app-shell">
      {/* モーダル類 (変更なし) */}
      {deleteTargetId && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop">
            <h2>⚠️ データの破棄</h2>
            <div className="warning-box" style={{ textAlign: 'center' }}>
              この記録を完全に削除しますか？<br />この操作は取り消せません。
            </div>
            <div className="modal-actions">
              <button className="confirm-btn" style={{ backgroundColor: 'var(--danger)' }} onClick={executeDelete}>破棄する</button>
              <button className="cancel-link" onClick={() => setDeleteTargetId(null)}>戻る</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop">
            <h2>📜 最終確認</h2>
            <div className="warning-box">
              注意：一度確定すると、この約束をアプリ内から削除することはできません。
            </div>
            <button
              type="button"
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              style={{ width: '100%', marginBottom: '16px', padding: '14px', fontSize: '0.9rem' }}
              onClick={(e) => playAudio(e, editingGoal.voiceData)}
              disabled={isPlaying}
            >
              {isPlaying ? '再生中... 🔊' : '録音内容を聴く 📢'}
            </button>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={finalizeContract}>この内容で決定する</button>
              <button className="cancel-link" onClick={() => setShowConfirm(false)}>修正に戻る</button>
            </div>
          </div>
        </div>
      )}

      {selectedGoal && (
        <div className="modal-overlay" onClick={() => setSelectedGoal(null)}>
          <div className="modal-content detail-view animate-pop" onClick={e => e.stopPropagation()}>
            <header className="detail-header">
              <h2>約束の詳細</h2>
              <button className="close-x" onClick={() => setSelectedGoal(null)}>×</button>
            </header>
            <div className="detail-body">
              <div className="info-item"><label>目標</label><p>{selectedGoal.title}</p></div>
              <div className="info-item"><label>目標を立てた理由</label><p>{selectedGoal.reason || "未設定"}</p></div>
              <div className="info-item"><label>達成できないと？</label><p className="risk-text">{selectedGoal.risk}</p></div>
              <div className="info-item"><label>期限</label><p>{selectedGoal.deadline}</p></div>
              <div className="info-item"><label>累計達成日数</label><p>{selectedGoal.logs.length} 日</p></div>

              {/* Heatmap Button */}
              <button
                className="analytics-btn"
                onClick={() => setAnalyticsGoal(selectedGoal)}
              >
                📊 継続の軌跡を見る
              </button>

              <button
                type="button"
                className={`play-btn wide ${isPlaying ? 'playing' : ''}`}
                onClick={(e) => playAudio(e, selectedGoal.voiceData)}
                disabled={isPlaying}
              >
                {isPlaying ? '再生中... 🔊' : '音声を聴く 📢'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Overlay (Full Screen) */}
      {analyticsGoal && (
        <div className="modal-overlay analytics-overlay" onClick={() => setAnalyticsGoal(null)}>
          <div className="modal-content analytics-content animate-pop" onClick={e => e.stopPropagation()}>
            <header className="detail-header">
              <h2>{analyticsGoal.title} の軌跡</h2>
              <button className="close-x" onClick={() => setAnalyticsGoal(null)}>×</button>
            </header>

            <div className="analytics-body">
              <div className="heatmap-container">
                <div className="custom-heatmap-grid">
                  {(() => {
                    // Start from the first log date, or today if no logs
                    let startDate = new Date();
                    if (analyticsGoal.logs && analyticsGoal.logs.length > 0) {
                      const sortedLogs = [...analyticsGoal.logs].sort();
                      startDate = new Date(sortedLogs[0]);
                    }

                    const days = [];
                    // Generate 300 days (fixed size grid) starting from startDate
                    // This makes the "Start" appear at Top-Left
                    for (let i = 0; i < 300; i++) {
                      const d = new Date(startDate);
                      d.setDate(d.getDate() + i);
                      days.push(d.toISOString().split('T')[0]);
                    }

                    return days.map(dateStr => {
                      const isActive = analyticsGoal.logs.includes(dateStr);
                      const isFailed = analyticsGoal.failureLogs && analyticsGoal.failureLogs.includes(dateStr);
                      return (
                        <div
                          key={dateStr}
                          className={`heatmap-cell ${isActive ? 'active' : ''} ${isFailed ? 'failed' : ''}`}
                          data-tooltip-id="grid-tooltip"
                          data-tooltip-content={`${dateStr} ${isActive ? 'Done!' : isFailed ? 'Failed...' : ''}`}
                        >
                          {isActive ? '〇' : isFailed ? '×' : ''}
                        </div>
                      );
                    });
                  })()}
                </div>
                <Tooltip id="grid-tooltip" />
              </div>

              <div className="analytics-stats">
                <div className="stat-box">
                  <span className="val">{analyticsGoal.logs.length}</span>
                  <span className="lbl">Total Days</span>
                </div>
                {/* Future: Add more stats here like Current Streak */}
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-link" onClick={() => setAnalyticsGoal(null)}>戻る</button>
            </div>

          </div>
        </div>
      )}

      {/* Achievement Selection Modal */}
      {resultPendingGoalId && (
        <div className="modal-overlay" onClick={() => { setResultPendingGoalId(null); setConfirmState(null); }}>
          <div className="modal-content animate-pop" onClick={e => e.stopPropagation()}>
            <h2>今日の達成報告</h2>
            {!confirmState ? (
              <>
                <div className="warning-box" style={{ textAlign: 'center', backgroundColor: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}>
                  今日のタスクは達成できましたか？<br />正直に記録しましょう。
                </div>
                <div className="modal-actions" style={{ flexDirection: 'column', gap: '12px' }}>
                  <button
                    className="confirm-btn"
                    onClick={() => setConfirmState('success')}
                  >
                    達成できた！ 🎉
                  </button>
                  <button
                    className="cancel-link"
                    style={{ width: '100%', backgroundColor: '#fee2e2', color: '#ef4444' }}
                    onClick={() => setConfirmState('failure')}
                  >
                    ダメだった... 😢
                  </button>
                  <button className="cancel-link" onClick={() => { setResultPendingGoalId(null); setConfirmState(null); }}>キャンセル</button>
                </div>
              </>
            ) : (
              <>
                <div className="warning-box" style={{ textAlign: 'center', backgroundColor: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
                  このまま進んでもよろしいですか？
                </div>
                <div className="modal-actions" style={{ gap: '12px' }}>
                  <button
                    className="cancel-link"
                    onClick={() => setConfirmState(null)}
                  >
                    戻る
                  </button>
                  <button
                    className="confirm-btn"
                    onClick={() => { handleDailyResult(resultPendingGoalId, confirmState === 'success'); setConfirmState(null); }}
                  >
                    進む
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* メインビュー */}
      {activeTab === 'home' && (
        <div className="view-container">
          <header className="view-header">
            <h1>進行中</h1>
            <button className="add-btn" onClick={startNewSetup}>+ 新規</button>
          </header>
          <div className="scroll-area">
            {goals.filter(g => new Date(g.deadline) >= new Date()).length === 0 && (
              <p className="empty-msg">現在進行中のものはありません。</p>
            )}
            {goals.filter(g => new Date(g.deadline) >= new Date()).map(g => {
              const today = new Date().toISOString().split('T')[0];
              const isDone = g.logs.includes(today);
              const isFailed = g.failureLogs && g.failureLogs.includes(today);

              return (
                <div key={g.id} className="mission-card">
                  <h3>{g.title}</h3>
                  <p className="deadline-info">締切: {g.deadline}</p>
                  <div className="card-ui">
                    <button
                      className={`log-btn ${isDone ? 'done' : ''} ${isFailed ? 'failed' : ''}`}
                      onClick={() => setResultPendingGoalId(g.id)}
                      disabled={isDone || isFailed}
                      style={isFailed ? { backgroundColor: '#ef4444', color: 'white', opacity: 0.7 } : {}}
                    >
                      {isDone ? '本日分完了' : isFailed ? '未達成...' : '今日のタスク'}
                    </button>
                    <button
                      type="button"
                      className={`play-btn ${isPlaying ? 'playing' : ''}`}
                      onClick={(e) => playAudio(e, g.voiceData)}
                      disabled={isPlaying}
                    >
                      {isPlaying ? '🔊' : '📢'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'setup' && editingGoal && (
        <div className="view-container">
          <header className="view-header"><h1>目標を立てましょう！！</h1></header>
          <div className="form-card">
            <div className="form-item"><label>具体的目標</label><input value={editingGoal.title} onChange={e => setEditingGoal({ ...editingGoal, title: e.target.value })} placeholder="例: 毎日プログラミング" /></div>
            <div className="form-item"><label>なぜやるのか</label><textarea value={editingGoal.reason} onChange={e => setEditingGoal({ ...editingGoal, reason: e.target.value })} placeholder="理由がないと人は諦めます" /></div>
            <div className="form-item"><label>期限の設定</label><input type="date" value={editingGoal.deadline} onChange={e => setEditingGoal({ ...editingGoal, deadline: e.target.value })} /></div>
            <div className="form-item"><label>達成できない時のリスク</label><input value={editingGoal.risk} onChange={e => setEditingGoal({ ...editingGoal, risk: e.target.value })} placeholder="よく考えてください" /></div>
            <div className="voice-area">
              <button className={`mic-btn ${isRecording ? 'active' : ''}`} onClick={handleRecord}>{isRecording ? '停止' : '録音'}</button>
              {editingGoal.voiceData && <span>録音完了 ✅</span>}
            </div>
            <button className="submit-btn" onClick={() => editingGoal.title && editingGoal.voiceData ? setShowConfirm(true) : alert("目標と録音が必要です")}>絶対に達成する</button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="view-container">
          <header className="view-header"><h1>アーカイブ</h1></header>
          <div className="archive-list">
            {goals.map(g => (
              <div key={g.id} className="archive-card" onClick={() => setSelectedGoal(g)}>
                <div className="archive-card-top">
                  <h4>{g.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className={`status-tag ${new Date(g.deadline) < new Date() ? 'expired' : 'living'}`}>
                      {new Date(g.deadline) < new Date() ? '満了' : '継続中'}
                    </span>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(g.id); }}>×</button>
                  </div>
                </div>
                <div className="archive-card-bottom">
                  <small>累計達成: {g.logs.length}日</small>
                  <small className="tap-hint">詳細を表示 →</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* システム設定ページは Cloudflare Tunnel を使用する運用では不要なため削除しました */}

      <nav className="global-nav">
        <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>HOME</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>LOGS</button>
      </nav>
    </div>
  );
}

export default App;