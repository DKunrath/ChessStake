// Componente de peças SVG estilo chess.com
import React from 'react'

interface ChessPieceProps {
  piece: string
  size?: number
}

const ChessPieceSVG: React.FC<ChessPieceProps> = ({ piece, size = 48 }) => {
  const isWhite = piece.startsWith('w')
  const pieceType = piece.slice(1)
  
  const fillColor = isWhite ? '#ffffff' : '#2d2d2d'
  const strokeColor = isWhite ? '#2d2d2d' : '#ffffff'
  
  const renderPiece = () => {
    switch (pieceType) {
      case 'K': // King
        return (
          <g>
            <path d="M24 8l4 4h-8l4-4zm-8 8h16v4h-16zm2 8h12l-2 8h-8z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="24" cy="6" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
          </g>
        )
      case 'Q': // Queen
        return (
          <g>
            <path d="M12 12l4-4 4 4 4-4 4 4v8h-16z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M12 20h16l-2 8h-12z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="14" cy="8" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="20" cy="6" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="26" cy="8" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="32" cy="10" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="38" cy="8" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
          </g>
        )
      case 'R': // Rook
        return (
          <g>
            <rect x="16" y="8" width="16" height="4" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <rect x="18" y="12" width="12" height="8" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <rect x="14" y="20" width="20" height="8" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <rect x="17" y="6" width="2" height="4" fill={fillColor}/>
            <rect x="23" y="6" width="2" height="4" fill={fillColor}/>
            <rect x="29" y="6" width="2" height="4" fill={fillColor}/>
          </g>
        )
      case 'B': // Bishop
        return (
          <g>
            <ellipse cx="24" cy="20" rx="8" ry="6" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M20 14c0-4 2-8 4-8s4 4 4 8" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="24" cy="8" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M16 26h16l-2 6h-12z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
          </g>
        )
      case 'N': // Knight
        return (
          <g>
            <path d="M20 12c-2-4 0-8 4-6l8 2c2 2 0 6-2 8l-4 4h-8z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M16 20h16l-2 8h-12z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <circle cx="26" cy="10" r="1.5" fill={strokeColor}/>
          </g>
        )
      case 'P': // Pawn
        return (
          <g>
            <circle cx="24" cy="12" r="4" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M20 16h8v4h-8z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
            <path d="M18 20h12l-2 8h-8z" fill={fillColor} stroke={strokeColor} strokeWidth="1"/>
          </g>
        )
      default:
        return null
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="drop-shadow-lg"
    >
      {renderPiece()}
    </svg>
  )
}

export default ChessPieceSVG
