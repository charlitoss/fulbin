import Modal from '../ui/Modal'
import CreateMatchForm from './CreateMatchForm'

// "Crear partido" as a dismissable modal so you can back out without losing
// your place in Mis partidos.
function CreateMatchModal({ isOpen, onClose, onNavigate }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear partido">
      <CreateMatchForm
        className="match-form match-form--in-modal"
        onCreated={(matchId) => {
          onClose()
          onNavigate(`#/partido/${matchId}`)
        }}
      />
    </Modal>
  )
}

export default CreateMatchModal
