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
  const [dishRecipe, setDishRecipe] = useState('')
  const [dishCookingTime, setDishCookingTime] = useState('')
  const [dishComponents, setDishComponents] = useState([''])
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
    setDishRecipe(dish.recipe || '')
    setDishCookingTime(dish.cookingTimeMinutes ? String(dish.cookingTimeMinutes) : '')
    setDishComponents(dish.components?.length ? dish.components : [''])
    setMealCategoryId(String(dish.mealCategoryId))
    setTypeCategoryId(String(dish.typeCategoryId))
  }, [dish])

  const updateComponentAt = (index, value) => {
    setDishComponents((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const addComponentField = () => {
    setDishComponents((prev) => [...prev, ''])
  }

  const removeComponentField = (index) => {
    setDishComponents((prev) => {
      if (prev.length === 1) {
        return ['']
      }

      return prev.filter((_item, idx) => idx !== index)
    })
  }

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
        recipe: dishRecipe,
        cookingTimeMinutes: dishCookingTime === '' ? null : Number(dishCookingTime),
        components: dishComponents,
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

          <label htmlFor="edit-recipe">рецепт</label>
          <textarea
            id="edit-recipe"
            rows={5}
            value={dishRecipe}
            onChange={(event) => setDishRecipe(event.target.value)}
          />

          <label htmlFor="edit-cooking-time">час приготування (хв)</label>
          <input
            id="edit-cooking-time"
            type="number"
            min="1"
            max="1440"
            step="1"
            value={dishCookingTime}
            onChange={(event) => setDishCookingTime(event.target.value)}
            placeholder="наприклад, 35"
          />

          <label>компоненти (інгредієнти)</label>
          <div className="component-list">
            {dishComponents.map((component, index) => (
              <div className="component-row" key={`route-edit-component-${index}`}>
                <input
                  value={component}
                  onChange={(event) => updateComponentAt(index, event.target.value)}
                  placeholder="наприклад, авокадо"
                />
                <button
                  type="button"
                  className="component-remove-btn"
                  onClick={() => removeComponentField(index)}
                  aria-label="видалити компонент"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="component-add-btn" onClick={addComponentField}>
              + додати компонент
            </button>
          </div>

          <label htmlFor="edit-meal-category">Категорія за часом дня</label>
          <select
            id="edit-meal-category"
            value={mealCategoryId}
            onChange={(event) => setMealCategoryId(event.target.value)}
            required
          >
            {mealCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name.toLowerCase()}
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
                {category.name.toLowerCase()}
              </option>
            ))}
          </select>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'зберігаю...' : 'оновити страву'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </main>
  )
}
