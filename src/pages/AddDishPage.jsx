import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AddDishPage({
  mealCategories,
  typeCategories,
  onAddDish,
  onGenerateDishRecipe,
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
  const [currentStep, setCurrentStep] = useState(1)
  const [mealCategoryId, setMealCategoryId] = useState('')
  const [typeCategoryId, setTypeCategoryId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false)

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
      setCurrentStep(1)

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

  const extractMinutesFromRecipeText = (text) => {
    const normalized = String(text || '')
    const match = normalized.match(/(\d{1,4})\s*(хв|хвилин|хвилини|min|minutes)/i)

    if (!match) {
      return null
    }

    const parsed = Number(match[1])
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1440) {
      return null
    }

    return parsed
  }

  const generateRecipeWithAi = async () => {
    const normalizedTitle = dishTitle.trim()
    const normalizedDescription = dishDescription.trim()
    const normalizedComponents = dishComponents.map((item) => String(item || '').trim()).filter(Boolean)

    if (!normalizedTitle) {
      setFormError('Для AI-генерації спочатку вкажіть назву страви')
      setFormMessage('')
      return
    }

    if (normalizedComponents.length === 0) {
      setFormError('Для AI-генерації додайте хоча б один інгредієнт')
      setFormMessage('')
      return
    }

    if (!onGenerateDishRecipe) {
      setFormError('AI-генерація тимчасово недоступна')
      setFormMessage('')
      return
    }

    setFormError('')
    setFormMessage('')
    setIsGeneratingRecipe(true)

    try {
      const generated = await onGenerateDishRecipe({
        title: normalizedTitle,
        description: normalizedDescription,
        components: normalizedComponents,
      })

      const recipeText = String(generated?.recipe || '').trim()
      if (!recipeText) {
        throw new Error('AI повернув порожню відповідь. Спробуйте ще раз')
      }

      setDishRecipe(recipeText)
      const apiMinutes = Number(generated?.cookingTimeMinutes)
      const fallbackMinutes = extractMinutesFromRecipeText(recipeText)
      const nextMinutes = Number.isInteger(apiMinutes) && apiMinutes > 0 ? apiMinutes : fallbackMinutes

      if (nextMinutes) {
        setDishCookingTime(String(nextMinutes))
      }
      setFormMessage('AI-рецепт згенеровано. Перевірте кроки і за потреби відредагуйте.')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsGeneratingRecipe(false)
    }
  }

  const goToStepTwo = () => {
    setFormError('')
    setFormMessage('')
    setCurrentStep(2)
  }

  const goToStepOne = () => {
    setFormError('')
    setFormMessage('')
    setCurrentStep(1)
  }

  const handleCancel = () => {
    if (embedded) {
      onClose?.()
      return
    }

    navigate(-1)
  }

  const isStepOneReady = dishTitle.trim().length > 0

  const content = (
    <>
      {embedded ? <h2 className="admin-modal-title">Додати нову страву</h2> : <h1>Додати нову страву</h1>}

      <section className={embedded ? 'admin-panel admin-panel--modal' : 'admin-panel'} aria-label="Форма додавання страви">
        <form className="admin-form admin-form-progress" onSubmit={submitDish}>
          <div className="add-dish-progress" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={currentStep}>
            <div className="add-dish-progress-line" aria-hidden="true">
              <span className={`add-dish-progress-node ${currentStep >= 1 ? 'is-complete' : ''} ${currentStep === 1 ? 'is-active' : ''}`}>
                1
              </span>
              <span className={`add-dish-progress-node ${currentStep >= 2 ? 'is-complete' : ''} ${currentStep === 2 ? 'is-active' : ''}`}>
                2
              </span>
              <span className="add-dish-progress-fill" style={{ width: currentStep === 1 ? '0%' : '100%' }} />
            </div>
            <div className="add-dish-progress-head">
              <span className={currentStep === 1 ? 'is-active' : ''}>Основа</span>
              <span className={currentStep === 2 ? 'is-active' : ''}>Рецепт</span>
            </div>
          </div>

          {currentStep === 1 ? (
            <>
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

              <div className="admin-form-actions">
                <button type="button" className="dish-modal-secondary" onClick={handleCancel}>
                  скасувати
                </button>
                <button type="button" onClick={goToStepTwo} disabled={!isStepOneReady}>
                  далі
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="admin-field-heading">
                <label htmlFor="dish-recipe">рецепт</label>
                <button
                  type="button"
                  className="admin-ai-generate-btn"
                  onClick={generateRecipeWithAi}
                  disabled={isSubmitting || isGeneratingRecipe}
                >
                  {isGeneratingRecipe ? 'генерую...' : 'згенерувати рецепт'}
                </button>
              </div>
              <p className="admin-ai-hint">AI може автоматично згенерувати кроки і приблизний час приготування.</p>
              <textarea
                id="dish-recipe"
                value={dishRecipe}
                onChange={(event) => setDishRecipe(event.target.value)}
                placeholder="кроки приготування"
                rows={7}
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
                placeholder="автоматично від AI або введіть вручну"
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
                <button type="button" className="dish-modal-secondary" onClick={goToStepOne}>
                  назад
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || mealCategories.length === 0 || typeCategories.length === 0}
                >
                  {isSubmitting ? 'зберігаю...' : '+ додати страву'}
                </button>
              </div>
            </>
          )}
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
