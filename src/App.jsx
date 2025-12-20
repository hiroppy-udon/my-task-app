import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // --- データの初期化 (ブラウザから読み込み) ---
  const [goalData, setGoalData] = useState(() => {
    const saved = localStorage.getItem('goalData')
    return saved ? JSON.parse(saved) : { title: '', reason: '', deadline: '', risk: '', reward: '', isStarted: false }
  })
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('habitHistory')
    return saved ? JSON.parse(saved) : []
  })

  // 初期画面の判定：目標が設定されていなければ強制的に setup 画面へ
  const [currentView, setCurrentView] = useState(goalData.isStarted ? 'dashboard' : 'setup')

  const today = new Date().toISOString().split('T')[0]
  const isDoneToday = history.some(log => log.date === today)

  // データの保存
  useEffect(() => {
    localStorage.setItem('goalData', JSON.stringify(goalData))
    localStorage.setItem('habitHistory', JSON.stringify(history))
  }, [goalData, history])

  const handleStart = () => {
    if (goalData.title && goalData.reason) {
      const newData = { ...goalData, isStarted: true }
      setGoalData(newData)
      setCurrentView('dashboard')
    }
  }

  const handleDone = () => {
    if (!isDoneToday) {
      setHistory([{ date: today, goal: goalData.title }, ...history])
    }
  }

  // --- 各画面のレンダリング ---
  const renderContent = () => {
    switch (currentView) {
      case 'setup':
        return (
          <div className="view-fade">
            <header className="page-header">
              <h1>自分との契約書</h1>
              <p>衝動を合理性に変える設計図 </p>
            </header>
            <div className="card setup-card">
              <div className="input-group">
                <label>成し遂げたい具体的目標</label>
                <input value={goalData.title} onChange={e => setGoalData({ ...goalData, title: e.target.value })} placeholder="例: 毎日プログラミング" />
              </div>
              <div className="input-group">
                <label>なぜやるのか（情熱の根拠）</label>
                <textarea value={goalData.reason} onChange={e => setGoalData({ ...goalData, reason: e.target.value })} placeholder="理由がないと人は諦めます " />
              </div>
              <div className="input-group">
                <label>達成期限</label>
                <input type="date" value={goalData.deadline} onChange={e => setGoalData({ ...goalData, deadline: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label>得られる報酬</label>
                  <input value={goalData.reward} onChange={e => setGoalData({ ...goalData, reward: e.target.value })} placeholder="リターン" />
                </div>
                <div className="input-group">
                  <label>やらないリスク</label>
                  <input value={goalData.risk} onChange={e => setGoalData({ ...goalData, risk: e.target.value })} placeholder="損失 " />
                </div>
              </div>
              <button className="primary-btn" onClick={handleStart}>誓いを立てて開始する</button>
            </div>
          </div>
        )
      case 'history':
        return (
          <div className="view-fade">
            <header className="page-header">
              <h1>振り返りアーカイブ</h1>
            </header>
            <div className="card">
              <h3>原点の確認</h3>
              <p className="reason-text"><strong>動機:</strong> {goalData.reason}</p>
              <p className="risk-text"><strong>不履行時の損失:</strong> {goalData.risk}</p>
            </div>
            <div className="history-list">
              {history.map((log, i) => (
                <div key={i} className="history-item card">
                  <span>✅ {log.date}</span>
                  <small>ACHIEVED</small>
                </div>
              ))}
            </div>
          </div>
        )
      default: // dashboard
        return (
          <div className="view-fade">
            <div className="dashboard-header card">
              <p className="label">TARGET</p>
              <h2>{goalData.title}</h2>
              <p className="deadline-text">期限まであと: {goalData.deadline}</p>
            </div>
            <div className="stats-grid">
              <div className="card stat-card">
                <span className="stat-val">{history.length}</span>
                <span className="stat-label">継続日数</span>
              </div>
              <div className="card stat-card">
                <span className="stat-val">{goalData.reward ? '🎁' : '-'}</span>
                <span className="stat-label">報酬</span>
              </div>
            </div>
            <button className={`action-btn ${isDoneToday ? 'done' : ''}`} onClick={handleDone} disabled={isDoneToday}>
              {isDoneToday ? '本日のノルマ完了' : '今日の自分に勝つ'}
            </button>
            <div className="motivation-quote card">
              <p>“{goalData.reason}”</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="mobile-container">
      <main className="content-area">{renderContent()}</main>
      <nav className="bottom-nav">
        <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''}>ホーム</button>
        <button onClick={() => setCurrentView('history')} className={currentView === 'history' ? 'active' : ''}>履歴</button>
        <button onClick={() => setCurrentView('setup')} className={currentView === 'setup' ? 'active' : ''}>設定</button>
      </nav>
    </div>
  )
}

export default App