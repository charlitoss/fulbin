// Pixel-styled status tag (Figma: Fulbin Design system / Tag).
// color: 'green' | 'orange' | 'grey'  ·  size: 'md' | 'lg'
function Tag({ color = 'green', size = 'md', className = '', children }) {
  return (
    <span className={`tag tag--${color} tag--${size}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}

export default Tag
