function EmptySlot({ index, onClick }) {
  return (
    <div className="empty-slot" onClick={onClick}>
      <span className="empty-slot-index">{index + 1}.</span>
      <span className="empty-slot-text">Lugar disponible</span>
      <img src="/icons/plus.svg" alt="" className="empty-slot-icon" width="24" height="24" />
    </div>
  )
}

export default EmptySlot
