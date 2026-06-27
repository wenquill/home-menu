import { useState } from 'react'

function parseInviteEmails(value) {
  const normalized = String(value || '')
    .split(/[\n,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@'))

  return Array.from(new Set(normalized))
}

export default function NoProjectAccessPage({ onCreateBoard }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [boardNotes, setBoardNotes] = useState('')
  const [inviteEmailsRaw, setInviteEmailsRaw] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const submitBoard = async (event) => {
    event.preventDefault()
    setFormError('')

    const normalizedName = String(boardName || '').trim()
    if (!normalizedName) {
      setFormError('Вкажіть назву дошки')
      return
    }

    setIsSubmitting(true)

    try {
      await onCreateBoard?.({
        name: normalizedName,
        notes: String(boardNotes || '').trim(),
        inviteEmails: parseInviteEmails(inviteEmailsRaw),
      })

      setIsModalOpen(false)
      setBoardName('')
      setBoardNotes('')
      setInviteEmailsRaw('')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="no-project-page" aria-label="Створення першої дошки">
      <section className="no-project-card">
        <div className="no-project-illustration" aria-hidden="true">
          <div className="no-project-envelope" />
          <div className="no-project-letter" />
          <div className="no-project-bubble no-project-bubble--one" />
          <div className="no-project-bubble no-project-bubble--two" />
          <div className="no-project-bubble no-project-bubble--three" />
        </div>

        <h1>Вітаємо у Home Menu</h1>
        <p>
          Почніть із власної дошки: придумайте назву, додайте короткі нотатки й за бажанням
          одразу запросіть користувачів.
        </p>

        <button
          type="button"
          className="no-project-create-button"
          onClick={() => setIsModalOpen(true)}
        >
          створити нову дошку
        </button>
      </section>

      {isModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setIsModalOpen(false)}>
          <section
            className="dish-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Створення дошки"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>створення дошки</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={submitBoard}>
              <label htmlFor="first-board-name">Назва дошки</label>
              <input
                id="first-board-name"
                type="text"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                maxLength={80}
                placeholder="наприклад: Сімейне меню"
                required
              />

              <label htmlFor="first-board-notes">Нотатки до дошки</label>
              <textarea
                id="first-board-notes"
                value={boardNotes}
                onChange={(event) => setBoardNotes(event.target.value)}
                maxLength={600}
                rows={4}
                placeholder="короткий опис або правила для учасників"
              />

              <label htmlFor="first-board-invites">Запросити користувачів (необовʼязково)</label>
              <textarea
                id="first-board-invites"
                value={inviteEmailsRaw}
                onChange={(event) => setInviteEmailsRaw(event.target.value)}
                rows={3}
                placeholder="email1@example.com, email2@example.com"
              />

              {formError ? <p className="state-message state-message--error">{formError}</p> : null}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'створюю...' : 'створити дошку'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
