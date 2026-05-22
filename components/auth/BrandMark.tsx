export function BrandMark({ size = 80, light = false }: { size?: number; light?: boolean }) {
  const bg   = light ? '#EEEBE2' : '#14141A'
  const fg   = light ? '#14141A' : '#EEEBE2'
  const fs   = Math.round(size * 0.55)
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Black Construction">
      <rect width="80" height="80" rx="10" fill={bg}/>
      <text
        x="50%" y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Arial Black, sans-serif"
        fontSize={fs}
        fontWeight="900"
        fill={fg}
        letterSpacing="-2"
      >B</text>
    </svg>
  )
}
