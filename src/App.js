import React, { useEffect, useRef, useState } from 'react'
import PlayerList from './components/PlayerList'
import Card from './components/Card'

const CARDS = ['0.5','1','2','3','5','8','13','20','40','100','?']

export default function App(){
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [name, setName] = useState('')
  const [myPlayerId, setMyPlayerId] = useState(null)

  useEffect(()=>{
    const ws = new WebSocket('ws://localhost:4000')
    wsRef.current = ws
    ws.onopen = ()=> setConnected(true)
    ws.onclose = ()=> setConnected(false)
    ws.onmessage = (ev)=>{
      try{
        const msg = JSON.parse(ev.data)
        if(msg.type === 'state'){
          setPlayers(msg.players || [])
          setRevealed(!!msg.revealed)
        } else if(msg.type === 'joined'){
          // store the assigned player id so the client can vote for self only
          setMyPlayerId(msg.playerId)
        }
      }catch(e){
        console.warn('invalid message', e)
      }
    }

    return ()=>{
      try{ ws.close() }catch(e){}
    }
  }, [])

  const send = (payload) => {
    if(wsRef.current && wsRef.current.readyState === WebSocket.OPEN){
      wsRef.current.send(JSON.stringify(payload))
    }
  }

  const addPlayer = ()=>{
    const trimmed = name.trim()
    if(!trimmed) return
    send({ type: 'join', name: trimmed })
    setName('')
  }

  const onVote = (playerId, vote) => send({ type: 'vote', playerId, vote })
  const reveal = () => send({ type: 'reveal' })
  const reset = () => send({ type: 'reset' })
  const clearPlayers = () => send({ type: 'clearPlayers' })

  return (
    <div className="app">
      <header>
        <h1>Planning Poker (CRA + WebSocket)</h1>
        <div className="status">Status: {connected ? 'connected' : 'disconnected'}</div>
      </header>

      <section className="controls">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Player name" onKeyDown={e=>e.key==='Enter' && addPlayer()} />
        <button onClick={addPlayer} disabled={!connected}>Join</button>
        <button onClick={reveal} disabled={!connected}>Reveal</button>
        <button onClick={reset} disabled={!connected}>Reset votes</button>
        <button onClick={clearPlayers} disabled={!connected}>Clear players</button>
      </section>

      <section className="cards">
        {CARDS.map(c => <Card key={c} value={c} />)}
      </section>

  <PlayerList players={players} onVote={onVote} revealed={revealed} cards={CARDS} myPlayerId={myPlayerId} />

      <footer className="footer">This demo uses a simple WebSocket server on port 4000 to broadcast state to all connected clients.</footer>
    </div>
  )
}
