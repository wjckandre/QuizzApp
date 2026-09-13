import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const [socket] = useState(() => io())
  const [view, setView] = useState('home')
  const [role, setRole] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const [winner, setWinner] = useState(null)
  const [round, setRound] = useState(1)
  const [error, setError] = useState('')
  const [scorePoints, setScorePoints] = useState(10)

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players])

  useEffect(() => {
    const updateRoom = (state) => {
      setRoomCode(state.code)
      setPlayers(state.players)
      setWinner(state.winner)
      setRound(state.round)
    }
    const closeRoom = () => {
      setError('La room a ete fermee.')
      setView('home')
    }
    const connectionError = () => setError('Serveur indisponible. Lancez npm.cmd run server.')
    socket.on('room-state', updateRoom)
    socket.on('room-closed', closeRoom)
    socket.on('connect_error', connectionError)
    return () => {
      socket.off('room-state', updateRoom)
      socket.off('room-closed', closeRoom)
      socket.off('connect_error', connectionError)
    }
  }, [socket])

  const createRoom = () => socket.emit('create-room', (response) => {
    if (!response.ok) return setError(response.error)
    setError('')
    setRole('admin')
    setRoomCode(response.code)
    setView('room')
  })

  const joinRoom = (event) => {
    event.preventDefault()
    socket.emit('join-room', { code: roomCode, name: playerName }, (response) => {
      if (!response.ok) return setError(response.error)
      setError('')
      setRole('player')
      setView('room')
    })
  }

  const awardPoints = (points = scorePoints) => {
    if (!winner) return
    socket.emit('score-player', { playerId: winner.id, points: Number(points) }, (response) => {
      if (!response.ok) setError(response.error)
    })
  }

  return (
    <main className="app">
      {view === 'home' && <section className="start-screen">
        <h1>QuizMaster</h1>
        <p>Quiz en temps reel avec buzzer.</p>
        <div className="start-actions">
          <button className="button primary" onClick={createRoom}>Creer une room</button>
          <button className="button" onClick={() => { setError(''); setView('join') }}>Rejoindre une room</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>}

      {view === 'join' && <section className="form-screen">
        <button className="link-button" onClick={() => setView('home')}>Retour</button>
        <h1>Rejoindre une room</h1>
        <form onSubmit={joinRoom}>
          <label>Code de la room<input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="QZ-123" maxLength={6} required /></label>
          <label>Votre pseudo<input autoFocus value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Ex. Alex" required /></label>
          {error && <p className="error">{error}</p>}
          <button className="button primary" type="submit">Entrer dans la room</button>
        </form>
      </section>}

      {view === 'room' && <section className="room-screen">
        <header className="room-header">
          <div><h1>QuizMaster</h1><span className="role">{role === 'admin' ? 'Administrateur' : 'Joueur'}</span></div>
          <div className="room-id">Room <strong>{roomCode}</strong><button onClick={() => navigator.clipboard?.writeText(roomCode)}>Copier</button></div>
        </header>
        <div className="room-layout">
          <section className="question-box">
            <div className="question-meta"><span className={winner ? 'locked' : 'open'}>{winner ? 'Buzzer verrouille' : 'Buzzer ouvert'}</span></div>
            {role === 'player' ? <>
              <h2>Quel est le plus grand ocean de notre planete ?</h2>
              {winner && <div className="winner-banner"><span className="winner-check">✓</span><div><strong>{winner.name}</strong><span>a buzze en premier</span></div></div>}
              <button className={`buzzer ${winner ? 'disabled' : ''}`} onClick={() => socket.emit('buzz')} disabled={Boolean(winner)}>{winner ? 'BUZZER VERROUILLE' : 'BUZZER'}</button>
            </> : <div className="admin-status">
              {winner ? <><div className="admin-winner"><span className="winner-check">✓</span><div><small>PREMIER BUZZ</small><strong>{winner.name}</strong><span>Le buzzer est verrouille</span></div></div><div className="score-controls"><label>Points<input type="number" min="-1000" max="1000" step="1" value={scorePoints} onChange={(event) => setScorePoints(event.target.value)} /></label><button className="button primary" onClick={() => awardPoints()}>Attribuer les points</button><button className="button" onClick={() => awardPoints(-Math.abs(Number(scorePoints)))}>Retirer</button></div></> : <><strong>En attente d'un buzzer</strong><p>Le premier joueur qui appuie sera affiche ici.</p></>}
            </div>}
          </section>
          <aside className="players-box">
            <h2>Joueurs ({players.length})</h2>
            {players.length === 0 && <p className="muted">En attente des joueurs...</p>}
            <ul>{sortedPlayers.map((player) => <li className={winner?.id === player.id ? 'winner' : ''} key={player.id}><span className={`avatar ${player.color}`}>{player.initials}</span><span>{player.name}<small>{player.status === 'online' ? 'En ligne' : 'Absent'}</small></span><strong>{player.score} pts</strong></li>)}</ul>
          </aside>
        </div>
        <footer className="room-controls">
          <span>{winner ? `${winner.name} a buzze en premier.` : 'Tous les joueurs peuvent buzzer.'}</span>
          {role === 'admin' && <button className="button primary" onClick={() => socket.emit('next-round')}>{winner ? 'Autoriser la suite' : 'Question suivante'}</button>}
        </footer>
      </section>}
    </main>
  )
}

export default App
