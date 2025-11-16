import React from 'react'

export default function InviteModal({ open, token, url, onClose }){
  if(!open) return null

  const copy = async (text) => {
    try{
      await navigator.clipboard.writeText(text)
      // small visual cue could be added
    }catch(e){
      console.warn('copy failed', e)
    }
  }

  return (
    <div className="invite-modal-backdrop">
      <div className="invite-modal">
        <h3>Invite link</h3>
        <div className="invite-row">
          <label>Token</label>
          <input readOnly value={token || ''} />
          <button onClick={()=>copy(token || '')}>Copy</button>
        </div>
        <div className="invite-row">
          <label>URL</label>
          <input readOnly value={url || ''} />
          <button onClick={()=>copy(url || '')}>Copy</button>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
