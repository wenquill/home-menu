import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AddDishPage({ mealCategories, typeCategories, onAddDish }) {
  const navigate = useNavigate()
  const [dishTitle, setDishTitle] = useState('')
  const [dishDescription, setDishDescription] = useState('')
  const [mealCategoryId, setMealCategoryId] = useState('')
  const [typeCategoryId, setTypeCategoryId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!mealCategoryId && mealCategories.length > 0) {
      setMealCategoryId(String(mealCategories[0].id))
    }

    if (!typeCategoryId && typeCategories.length > 0) {
      setTypeCategoryId(String(typeCategories[0].id))
    }
  }, [mealCategoryId, typeCategoryId, mealCategories, typeCategories])

  const submitDish = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')
    setIsSubmitting(true)

    try {
      await onAddDish({
        title: dishTitle,
        description: dishDescription,
        mealCategoryId: Number(mealCategoryId),
        typeCategoryId: Number(typeCategoryId),
      })

      setDishTitle('')
      setDishDescription('')
      setFormMessage('Страву успішно додано')
      navigate(`/category/${mealCategoryId}`)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1>Додати нову страву</h1>

      <section className="admin-panel" aria-label="Форма додавання страви">
        <form className="admin-form" onSubmit={submitDish}>
          <label htmlFor="dish-title">Назва страви</label>
          <input
            id="dish-title"
            value={dishTitle}
            onChange={(event) => setDishTitle(event.target.value)}
            placeholder="Наприклад, Сирники з ягодами"
            required
          />

          <label htmlFor="dish-description">Опис</label>
          <textarea
            id="dish-description"
            value={dishDescription}
            onChange={(event) => setDishDescription(event.target.value)}
            placeholder="Короткий опис страви"
            rows={4}
          />

          <label htmlFor="meal-category">Категорія за часом дня</label>
          <select
            id="meal-category"
            value={mealCategoryId}
            onChange={(event) => setMealCategoryId(event.target.value)}
            required
          >
            {mealCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label htmlFor="type-category">Категорія за видом страви</label>
          <select
            id="type-category"
            value={typeCategoryId}
            onChange={(event) => setTypeCategoryId(event.target.value)}
            required
          >
            {typeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isSubmitting || mealCategories.length === 0 || typeCategories.length === 0}
          >
            {isSubmitting ? 'Зберігаю...' : 'Додати страву'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </main>
  )
}
