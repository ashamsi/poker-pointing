import React, { useState } from 'react'
import PlayerList from './components/PlayerList'
import Card from './components/Card'

const defaultCards = ['0.5','1','2','3','5','8','13','20','40','100','?']

export default function App(){
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [revealed, setRevealed] = useState(false)

  const addPlayer = ()=>{
    const trimmed = name.trim()
    if(!trimmed) return
    setPlayers(p => [...p, { id: Date.now() + Math.random(), name: trimmed, vote: null }])
    setName('')
  }

  const setVote = (playerId, vote)=>{
    setPlayers(p => p.map(pl => pl.id === playerId ? { ...pl, vote } : pl))
  }

  const reveal = ()=> setRevealed(true)
  const reset = ()=>{
    setPlayers(p => p.map(pl => ({ ...pl, vote: null })))
    setRevealed(false)
  }

  const clearPlayers = ()=>{
    setPlayers([])
    setRevealed(false)
  }

  return (
    <div className="app">
      <header>
        <h1>Planning Poker</h1>
      </header>

      <section className="controls">
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          placeholder="Player name"
          onKeyDown={e=>e.key === 'Enter' && addPlayer()}
        />
        <button onClick={addPlayer}>Add Player</button>
        <button onClick={reveal} disabled={revealed}>Reveal</button>
        <button onClick={reset}>Reset votes</button>
        <button onClick={clearPlayers}>Clear players</button>
      </section>

      <section className="cards">
        {defaultCards.map(c => (
          <Card key={c} value={c} />
        ))}
      </section>

      <PlayerList players={players} onVote={(id, vote) => setVote(id, vote)} revealed={revealed} cards={defaultCards} />

      <footer className="footer">Votes are hidden until you press Reveal. Click a card next to a player to set their vote.</footer>
    </div>
  )
}
