import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const categories = ['Échauffement', 'L atelier', 'Lore très obscur', 'Contexte', 'Trucs aléatoires']
const slides = {
  'Échauffement': [
    { title: 'Échauffement', image: '/slides/2022compet.png' },
    { title: "En quelle année l'équipe Stan Robotix a-t-elle été créée ?", answer: '2016' },
    { title: 'Qui sont les membres fondateurs de Stan Robotix ?', answer: 'Derek et Mikael' },
    { title: 'Robotix lore', image: '/slides/ROBOTIXLORE.png' },
    { title: 'Quand il n’y a pas Robotix', image: '/slides/norobotixbottomtext.png' },
    { title: 'Actual gameplay', image: '/slides/culte.png' },
  ],
  'L atelier': [
    { title: "L'atelier, ma deuxième maison" },
    { title: 'Quel est le code du cadenas de l’armoire de la M109 ?', answer: '13-3-21' },
    { title: 'De quelle franchise provient ce jouet ?', answer: 'Kinder Surprise', image: '/atelier/poney.png' },
  ],
  'Lore très obscur': [{ title: 'Lore très (très) obscur', image: '/slides/stonksandre.png' }],
  Contexte: [{ title: '« Contexte ? »', image: '/slides/visibleconfusionmax.jpg' }],
  'Trucs aléatoires': [{ title: 'Trucs aléatoires', image: '/slides/whenréu.png' }],
}

function App() {
  const [socket] = useState(() => io())
  const [view, setView] = useState('home')
  const [role, setRole] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const [winner, setWinner] = useState(null)
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState('question')
  const [category, setCategory] = useState('Échauffement')
  const [slide, setSlide] = useState(0)
  const [error, setError] = useState('')
  const [scorePoints, setScorePoints] = useState(10)

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players])

  useEffect(() => {
    const updateRoom = (state) => {
      setRoomCode(state.code)
      setPlayers(state.players)
      setWinner(state.winner)
      setRound(state.round)
      setPhase(state.phase)
      setCategory(state.category)
      setSlide(state.slide)
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
        {role === 'player' && phase === 'buzz' ? <div className="player-buzzer-only">
          <span className={`player-buzzer-status ${phase === 'buzz' ? 'open' : ''}`}>{winner ? 'Buzzer verrouille' : phase === 'buzz' ? 'Buzzer ouvert' : 'En attente de l admin'}</span>
          <button className={`buzzer ${winner || phase !== 'buzz' ? 'disabled' : ''}`} onClick={() => socket.emit('buzz')} disabled={Boolean(winner) || phase !== 'buzz'}>{winner ? 'BUZZER VERROUILLE' : phase === 'buzz' ? 'BUZZER' : 'BUZZER FERME'}</button>
          {winner && <div className="player-winner-note">{winner.name} a buzze en premier.</div>}
        </div> : role === 'admin' && phase === 'buzz' ? <div className="admin-buzz-layout">
          <section className="admin-status"><div className="question-meta"><span>Buzzer ouvert</span></div>{winner ? <><div className="admin-winner"><span className="winner-check">✓</span><div><small>PREMIER BUZZ</small><strong>{winner.name}</strong><span>Le buzzer est verrouille</span></div></div><div className="score-controls"><label>Points<input type="number" min="-1000" max="1000" step="1" value={scorePoints} onChange={(event) => setScorePoints(event.target.value)} /></label><button className="button primary" onClick={() => awardPoints()}>Attribuer les points</button><button className="button" onClick={() => awardPoints(-Math.abs(Number(scorePoints)))}>Retirer</button></div></> : <div className="admin-waiting"><strong>En attente d'un buzzer</strong><p>Le premier joueur qui appuie sera affiche ici.</p></div>}</section>
          <aside className="players-box"><h2>Joueurs ({players.length})</h2><ul>{sortedPlayers.map((player) => <li className={winner?.id === player.id ? 'winner' : ''} key={player.id}><span className={`avatar ${player.color}`}>{player.initials}</span><span>{player.name}<small>En ligne</small></span><strong>{player.score} pts</strong></li>)}</ul></aside>
        </div> : <div className="presentation-layout">
          <nav className="category-grid">{categories.map((item) => <button className={item === category ? 'selected' : ''} disabled={role !== 'admin'} key={item} onClick={() => socket.emit('presentation-category', item)}>{item}</button>)}</nav>
          <section className="presentation-stage">
            <div className="slide-count">{slide + 1} / {slides[category].length}</div>
            <div className="slide-content"><h2>{slides[category][slide].title}</h2>{slides[category][slide].image && <img src={slides[category][slide].image} alt="" />}{slides[category][slide].answer && <p className="slide-answer">{slides[category][slide].answer}</p>}</div>
            <button className="slide-arrow previous" disabled={role !== 'admin' || slide === 0} onClick={() => socket.emit('presentation-slide', 'previous')} aria-label="Slide précédente">‹</button>
            <button className="slide-arrow next" disabled={role !== 'admin' || slide === slides[category].length - 1} onClick={() => socket.emit('presentation-slide', 'next')} aria-label="Slide suivante">›</button>
          </section>
          <aside className="score-strip"><strong>Scores</strong>{sortedPlayers.length === 0 && <span className="muted">En attente des joueurs...</span>}{sortedPlayers.map((player) => <span className="team-score" key={player.id}><i className={`avatar ${player.color}`}>{player.initials}</i>{player.name}<b>{player.score}</b></span>)}</aside>
        </div>}
        <footer className="room-controls">
          <span>{phase === 'question' ? 'Vue question et scores.' : (winner ? `${winner.name} a buzze en premier.` : 'Tous les joueurs peuvent buzzer.')}</span>
          {role === 'admin' && <button className="button primary" onClick={() => socket.emit('next-round')}>{phase === 'question' ? 'Ouvrir les buzzers' : 'Question suivante'}</button>}
        </footer>
      </section>}
    </main>
  )
}

export default App
