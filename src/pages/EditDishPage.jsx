import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

export default function EditDishPage({
  dishes,
  mealCategories,
  typeCategories,
  isAdmin,
  onUpdateDish,
}) {
  const navigate = useNavigate()
  const { dishId } = useParams()
  const selectedDishId = Number(dishId)

  const dish = dishes.find((item) => item.id === selectedDishId)

  const [dishTitle, setDishTitle] = useState('')
  const [dishDescription, setDishDescription] = useState('')
  const [mealCategoryId, setMealCategoryId] = useState('')
  const [typeCategoryId, setTypeCategoryId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!dish) {
      return
    }

    setDishTitle(dish.title)
    setDishDescription(dish.description)
    setMealCategoryId(String(dish.mealCategoryId))
    setTypeCategoryId(String(dish.typeCategoryId))
  }, [dish])

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  if (!dish) {
    return (
      <main className="category-page">
        <h1>Страву не знайдено</h1>
      </main>
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')
    setIsSubmitting(true)

    try {
      const updated = await onUpdateDish({
        id: dish.id,
        title: dishTitle,
        description: dishDescription,
        mealCategoryId: Number(mealCategoryId),
        typeCategoryId: Number(typeCategoryId),
      })

      setFormMessage('Страву оновлено')
      navigate(`/category/${updated.mealCategoryId}`)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1>Редагувати страву</h1>

      <section className="admin-panel" aria-label="Форма редагування страви">
        <form className="admin-form" onSubmit={submit}>
          <label htmlFor="edit-title">Назва страви</label>
          <input
            id="edit-title"
            value={dishTitle}
            onChange={(event) => setDishTitle(event.target.value)}
            required
          />

          <label htmlFor="edit-description">Опис</label>
          <textarea
            id="edit-description"
            rows={4}
            value={dishDescription}
            onChange={(event) => setDishDescription(event.target.value)}
          />

          <label htmlFor="edit-meal-category">Категорія за часом дня</label>
          <select
            id="edit-meal-category"
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

          <label htmlFor="edit-type-category">Категорія за видом страви</label>
          <select
            id="edit-type-category"
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

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Зберігаю...' : 'Оновити страву'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </main>
  )
}
