import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AddCategoryPage({ onAddCategory }) {
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
      setFormMessage('Категорію успішно додано')
      navigate(`/category/${created.id}`)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1>Додати нову категорію</h1>

      <section className="admin-panel" aria-label="Форма додавання категорії">
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
            <option value="MEAL">За часом дня</option>
            <option value="TYPE">За видом страви</option>
          </select>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Зберігаю...' : 'Додати категорію'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </main>
  )
}
