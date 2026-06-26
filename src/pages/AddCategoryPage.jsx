import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AddCategoryPage({ onAddCategory, embedded = false, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [categoryName, setCategoryName] = useState('')
  const [categoryKind, setCategoryKind] = useState('MEAL')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitCategory = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')
    setIsSubmitting(true)

    try {
      const created = await onAddCategory({
        name: categoryName,
        kind: categoryKind,
      })

      setCategoryName('')

      if (embedded) {
        onSuccess?.(created)
      } else {
        setFormMessage('Категорію успішно додано')
        navigate(`/category/${created.id}`)
      }
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <>
      {embedded ? <h2 className="admin-modal-title">Додати нову категорію</h2> : <h1>Додати нову категорію</h1>}

      <section className={embedded ? 'admin-panel admin-panel--modal' : 'admin-panel'} aria-label="Форма додавання категорії">
        <form className="admin-form" onSubmit={submitCategory}>
          <label htmlFor="category-name">Назва категорії</label>
          <input
            id="category-name"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Наприклад, Супи"
            required
          />

          <label htmlFor="category-kind">Тип категорії</label>
          <select
            id="category-kind"
            value={categoryKind}
            onChange={(event) => setCategoryKind(event.target.value)}
          >
            <option value="MEAL">за часом дня</option>
            <option value="TYPE">за видом страви</option>
          </select>

          <div className="admin-form-actions">
            {embedded ? (
              <button type="button" className="dish-modal-secondary" onClick={onClose}>
                скасувати
              </button>
            ) : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'зберігаю...' : 'додати категорію'}
            </button>
          </div>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </>
  )

  if (embedded) {
    return <div className="admin-modal-content">{content}</div>
  }

  return <main className="category-page">{content}</main>
}
