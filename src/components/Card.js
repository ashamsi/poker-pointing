import React from 'react'

export default function Card({ value, onClick, className = '' }){
  return (
    <button className={`card ${className}`} onClick={onClick}>{value}</button>
  )
}
