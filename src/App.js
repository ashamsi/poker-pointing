import React, { useEffect, useRef, useState } from 'react'
import PlayerList from './components/PlayerList'
import Card from './components/Card'
import InviteModal from './components/InviteModal'
import TicketSearchModal from './components/TicketSearchModal'

const CARDS = ['.25', '.5', '1', '2', '3', '5']

export default function App(){ 
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketSearchOpen, setTicketSearchOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [name, setName] = useState('')
  const [myPlayerId, setMyPlayerId] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [role, setRole] = useState(null) // 'host' | 'participant'
  const [joinRoomInput, setJoinRoomInput] = useState('')
  const [joinInviteToken, setJoinInviteToken] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteTokenState, setInviteTokenState] = useState(null)
  const [inviteUrlState, setInviteUrlState] = useState(null)

  // Parse URL params on mount to auto-populate join form
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    const inviteParam = params.get('invite')
    if(roomParam) setJoinRoomInput(roomParam)
    if(inviteParam) setJoinInviteToken(inviteParam)
  }, [])

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
          setSelectedTicket(msg.selectedTicket || null)
        } else if(msg.type === 'joined'){
          // store the assigned player id so the client can vote for self only
          setMyPlayerId(msg.playerId)
          setRole(msg.role || 'participant')
          setRoomId(msg.roomId)
        } else if(msg.type === 'room-created'){
          setRoomId(msg.roomId)
          if(msg.playerId) setMyPlayerId(msg.playerId)
          setRole('host')
          // optionally expose inviteToken to UI (not stored globally here)
        } else if(msg.type === 'invite-created'){
          // show invite modal with token/url
          setInviteTokenState(msg.token)
          // build URL with room and invite params for easy sharing
          const roomId = msg.roomId
          const url = `${window.location.origin}?room=${roomId}&invite=${msg.token}`
          setInviteUrlState(url)
          setInviteModalOpen(true)
        } else if(msg.type === 'error'){
          console.warn('server error', msg.message)
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

  // Room / join actions
  const createRoom = ()=>{
    const trimmed = name.trim() || 'Host'
    send({ type: 'create-room', name: trimmed })
  }

  const joinRoom = ()=>{
    const trimmed = (joinRoomInput || '').trim()
    if(!trimmed) return
    send({ type: 'join', roomId: trimmed, name: name || 'Guest', inviteToken: joinInviteToken || null })
    setJoinRoomInput('')
    setJoinInviteToken('')
    setName('')
  }

  const createInvite = ()=>{ if(roomId) send({ type: 'create-invite', roomId }) }

  const addPlayer = ()=>{
    const trimmed = name.trim()
    if(!trimmed) return
    // fallback for legacy behavior: join without room
    send({ type: 'join', roomId: null, name: trimmed })
    setName('')
  }

  const onVote = (playerId, vote, comment = null) => {
    if(roomId && myPlayerId){
      send({ type: 'vote', roomId, playerId: myPlayerId, vote, comment })
    } else {
      // legacy: local vote
      send({ type: 'vote', playerId, vote, comment })
    }
  }

  const reveal = () => { if(roomId) send({ type: 'reveal', roomId }) }
  const reset = () => { if(roomId) send({ type: 'reset', roomId }) }
  const clearPlayers = () => { if(roomId) send({ type: 'clearPlayers', roomId }) }
  const selectTicket = (ticket) => { 
    setSelectedTicket(ticket)
    if(roomId) send({ type: 'select-ticket', roomId, ticket })
  }

  return (
    <div className="app">
      <header>
        <h1>Planning Poker (CRA + WebSocket)</h1>
        <div className="status">Status: {connected ? 'connected' : 'disconnected'}</div>
      </header>

      <section className="controls">
        {!roomId ? (
          <>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
            <button onClick={createRoom} disabled={!connected}>Create room (host)</button>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input value={joinRoomInput} onChange={e=>setJoinRoomInput(e.target.value)} placeholder="Room ID" />
              <input value={joinInviteToken} onChange={e=>setJoinInviteToken(e.target.value)} placeholder="Invite token (optional)" />
              <button onClick={joinRoom} disabled={!connected}>Join room</button>
            </div>
          </>
        ) : (
          <>
            <div style={{marginBottom: 12}}>
              <div>Room: {roomId} — Role: {role}</div>
              {selectedTicket && (
                <div style={{marginTop: 8, padding: '8px 12px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: 6, borderLeft: '3px solid var(--accent)'}}>
                  <strong>{selectedTicket.key}</strong>: {selectedTicket.summary}
                  {selectedTicket.storyPoints && <span> ({selectedTicket.storyPoints} pts)</span>}
                  {selectedTicket.description && (
                    <div className="ticket-description" style={{marginTop: 8}} dangerouslySetInnerHTML={{__html: selectedTicket.description}}>
                    </div>
                  )}
                  {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                    <div style={{marginTop:8, fontSize:13, color:'#cbd5e1'}}>
                      <div style={{fontWeight:700, fontSize:12, color:'#94a3b8', marginBottom:6}}>Recent comments {selectedTicket.comments.length > 3 && <a href={selectedTicket.url} target="_blank" rel="noreferrer" style={{fontWeight:400, color:'var(--accent)', textDecoration:'none'}}>· View all ({selectedTicket.comments.length})</a>}</div>
                      {selectedTicket.comments.slice(0,3).map(c => (
                        <div key={c.id} style={{marginBottom:6, paddingLeft:6, borderLeft:'2px solid rgba(255,255,255,0.03)'}}>
                          <div style={{fontSize:12, fontWeight:600, color:'#e6eef8'}}>{c.author} <span style={{fontWeight:400, color:'#94a3b8', fontSize:11}}>· {new Date(c.created).toLocaleString()}</span></div>
                          <div style={{fontSize:13, color:'#cbd5e1', lineHeight:1.4, maxHeight: 48, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical'}} dangerouslySetInnerHTML={{__html: c.body}}></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {role === 'host' ? (
              <div style={{display:'flex',gap:8, flexWrap:'wrap'}}>
                <button onClick={() => setTicketSearchOpen(true)}>Search JIRA</button>
                <button onClick={createInvite}>Create invite</button>
                <button onClick={reveal} disabled={revealed}>Reveal</button>
                <button onClick={reset}>Reset votes</button>
                <button onClick={clearPlayers}>Clear players</button>
              </div>
            ) : (
              <div>Waiting for host actions (you can vote)</div>
            )}
          </>
        )}
  {/* legacy controls removed when using rooms; use the room UI above */}
      </section>

      <section className="cards">
        {CARDS.map(c => <Card key={c} value={c} />)}
      </section>

  <PlayerList players={players} onVote={onVote} revealed={revealed} cards={CARDS} myPlayerId={myPlayerId} />

  <InviteModal open={inviteModalOpen} token={inviteTokenState} url={inviteUrlState} onClose={()=>{ setInviteModalOpen(false); setInviteTokenState(null); setInviteUrlState(null) }} />
  
  <TicketSearchModal open={ticketSearchOpen} onClose={()=>setTicketSearchOpen(false)} onSelectTicket={selectTicket} />

      <footer className="footer">This demo uses a simple WebSocket server on port 4000 to broadcast state to all connected clients.</footer>
    </div>
  )
}
