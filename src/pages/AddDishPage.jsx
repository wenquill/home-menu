import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AddDishPage({
  mealCategories,
  typeCategories,
  onAddDish,
  embedded = false,
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate()
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
        recipe: dishRecipe,
        cookingTimeMinutes: dishCookingTime === '' ? null : Number(dishCookingTime),
        components: dishComponents,
        mealCategoryId: Number(mealCategoryId),
        typeCategoryId: Number(typeCategoryId),
      })

      setDishTitle('')
      setDishDescription('')
      setDishRecipe('')
      setDishCookingTime('')
      setDishComponents([''])

      if (embedded) {
        onSuccess?.()
      } else {
        setFormMessage('Страву успішно додано')
        navigate(`/category/${mealCategoryId}`)
      }
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const content = (
    <>
      {embedded ? <h2 className="admin-modal-title">Додати нову страву</h2> : <h1>Додати нову страву</h1>}

      <section className={embedded ? 'admin-panel admin-panel--modal' : 'admin-panel'} aria-label="Форма додавання страви">
        <form className="admin-form" onSubmit={submitDish}>
          <label htmlFor="dish-title">Назва страви</label>
          <input
            id="dish-title"
            value={dishTitle}
            onChange={(event) => setDishTitle(event.target.value)}
            placeholder="наприклад, сирники з ягодами"
            required
          />

          <label htmlFor="dish-description">Опис</label>
          <textarea
            id="dish-description"
            value={dishDescription}
            onChange={(event) => setDishDescription(event.target.value)}
            placeholder="короткий опис страви"
            rows={4}
          />

          <label htmlFor="dish-recipe">рецепт</label>
          <textarea
            id="dish-recipe"
            value={dishRecipe}
            onChange={(event) => setDishRecipe(event.target.value)}
            placeholder="кроки приготування"
            rows={5}
          />

          <label htmlFor="dish-cooking-time">час приготування (хв)</label>
          <input
            id="dish-cooking-time"
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
              <div className="component-row" key={`new-component-${index}`}>
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

          <label htmlFor="meal-category">Категорія за часом дня</label>
          <select
            id="meal-category"
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

          <label htmlFor="type-category">Категорія за видом страви</label>
          <select
            id="type-category"
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

          <div className="admin-form-actions">
            {embedded ? (
              <button type="button" className="dish-modal-secondary" onClick={onClose}>
                скасувати
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting || mealCategories.length === 0 || typeCategories.length === 0}
            >
              {isSubmitting ? 'зберігаю...' : '+ додати страву'}
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
