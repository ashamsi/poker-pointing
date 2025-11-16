const WebSocket = require('ws')

const PORT = process.env.PORT || 4000
const wss = new WebSocket.Server({ port: PORT })

const state = {
  players: [],
  revealed: false
}

function broadcast(){
  // Send a tailored view to each connected client so votes remain private until revealed.
  for(const client of wss.clients){
    if(client.readyState !== WebSocket.OPEN) continue

    // For each client, build a players view where:
    // - If state.revealed is true -> include real votes
    // - Else include the real vote only for the player's own id (client.playerId)
    // - For other players, include a truthy placeholder if they have voted so UI can show "Voted"
    const viewPlayers = state.players.map(p => {
      if(state.revealed) return { id: p.id, name: p.name, vote: p.vote }
      if(client.playerId && client.playerId === p.id) return { id: p.id, name: p.name, vote: p.vote }
      return { id: p.id, name: p.name, vote: p.vote ? '__VOTED__' : null }
    })

    const msg = JSON.stringify({ type: 'state', players: viewPlayers, revealed: state.revealed })
    client.send(msg)
  }
}

wss.on('connection', (ws) => {
  // send initial state
  ws.send(JSON.stringify({ type: 'state', players: state.players, revealed: state.revealed }))

  ws.on('message', (data) => {
    let msg
    try{ msg = JSON.parse(data.toString()) }catch(e){ return }

    switch(msg.type){
      case 'join': {
        const id = Date.now() + Math.random()
        const player = { id, name: msg.name || 'Anonymous', vote: null }
        state.players.push(player)
        ws.playerId = id
        // inform the joining client of their assigned id
        ws.send(JSON.stringify({ type: 'joined', playerId: id }))
        broadcast()
        break
      }
      case 'vote': {
        const p = state.players.find(x => x.id === msg.playerId)
        if(p) p.vote = msg.vote
        broadcast()
        break
      }
      case 'reveal': {
        state.revealed = true
        broadcast()
        break
      }
      case 'reset': {
        state.players = state.players.map(p => ({ ...p, vote: null }))
        state.revealed = false
        broadcast()
        break
      }
      case 'clearPlayers': {
        state.players = []
        state.revealed = false
        broadcast()
        break
      }
      default:
        // ignore
    }
  })

  ws.on('close', () => {
    if(ws.playerId){
      state.players = state.players.filter(p => p.id !== ws.playerId)
      broadcast()
    }
  })
})

console.log(`WebSocket server listening on ws://localhost:${PORT}`)
