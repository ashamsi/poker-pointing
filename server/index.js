const WebSocket = require('ws')
const crypto = require('crypto')

const PORT = process.env.PORT || 4000
const wss = new WebSocket.Server({ port: PORT })

const rooms = {}

function makeId(len = 6){
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0,len)
}

function broadcastRoom(room){
  for(const client of wss.clients){
    if(client.readyState !== WebSocket.OPEN) continue
    if(!client.roomId || client.roomId !== room.id) continue

    const viewPlayers = room.players.map(p => {
      if(room.revealed) return { id: p.id, name: p.name, vote: p.vote, comment: p.comment }
      if(client.playerId && client.playerId === p.id) return { id: p.id, name: p.name, vote: p.vote, comment: p.comment }
      return { id: p.id, name: p.name, vote: p.vote ? '__VOTED__' : null }
    })

    const msg = JSON.stringify({ type: 'state', roomId: room.id, players: viewPlayers, revealed: room.revealed, hostPlayerId: room.hostPlayerId })
    client.send(msg)
  }
}

function findRoomById(roomId){ return rooms[roomId] }

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'ready' }))

  ws.on('message', (data) => {
    let msg
    try{ msg = JSON.parse(data.toString()) }catch(e){ return }

    const sendError = (text) => { try{ ws.send(JSON.stringify({ type: 'error', message: text })) }catch(e){} }

    switch(msg.type){
      case 'create-room': {
        const roomId = makeId(8)
        const playerId = makeId(10)
        const name = msg.name || 'Host'
        const room = { id: roomId, hostPlayerId: playerId, players: [], revealed: false, invites: [] }
        const player = { id: playerId, name, vote: null, connected: true }
        room.players.push(player)
        const token = makeId(12)
        room.invites.push(token)
        rooms[roomId] = room

        ws.roomId = roomId
        ws.playerId = playerId
        ws.send(JSON.stringify({ type: 'room-created', roomId, playerId, inviteToken: token, url: `/room/${roomId}` }))
        broadcastRoom(room)
        break
      }

      case 'create-invite': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room) { sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host may create invites'); break }
        const token = makeId(12)
        room.invites.push(token)
        ws.send(JSON.stringify({ type: 'invite-created', roomId, token, url: `/room/${roomId}?invite=${token}` }))
        break
      }

      case 'join': {
        const { roomId, name, inviteToken } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }

        if(room.invites && room.invites.length > 0){
          if(!inviteToken || !room.invites.includes(inviteToken)){
            sendError('invite token required or invalid')
            break
          }
        }

        const id = makeId(10)
        const player = { id, name: name || 'Anonymous', vote: null, connected: true }
        room.players.push(player)
        ws.playerId = id
        ws.roomId = roomId

        ws.send(JSON.stringify({ type: 'joined', playerId: id, role: (id === room.hostPlayerId ? 'host' : 'participant'), roomId }))
        broadcastRoom(room)
        break
      }

      case 'vote': {
        const { roomId, playerId, vote, comment } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== playerId){ sendError('you can only vote for yourself'); break }
        const p = room.players.find(x => x.id === playerId)
        if(p){ 
          p.vote = vote
          p.comment = comment || null
        }
        broadcastRoom(room)
        break
      }

      case 'reveal': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can reveal'); break }
        room.revealed = true
        broadcastRoom(room)
        break
      }

      case 'reset': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can reset'); break }
        room.players = room.players.map(p => ({ ...p, vote: null, comment: null }))
        room.revealed = false
        broadcastRoom(room)
        break
      }

      case 'clearPlayers': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can clear players'); break }
        room.players = []
        room.revealed = false
        broadcastRoom(room)
        break
      }

      default:
        // unknown message
    }
  })

  ws.on('close', () => {
    const { roomId, playerId } = ws
    if(!roomId || !playerId) return
    const room = findRoomById(roomId)
    if(!room) return

    room.players = room.players.filter(p => p.id !== playerId)

    if(room.hostPlayerId === playerId){
      if(room.players.length > 0){
        room.hostPlayerId = room.players[0].id
      } else {
        delete rooms[roomId]
        return
      }
    }

    broadcastRoom(room)
  })
})

console.log(`WebSocket server listening on ws://localhost:${PORT}`)
