import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

function DishCard({ title, description, isAdmin, onOpen, onEdit }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="dish-card dish-card--interactive"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Відкрити страву ${title}`}
    >
      <h3>{title}</h3>
      <p>{description}</p>
      {isAdmin ? (
        <button
          type="button"
          className="dish-edit-button"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
        >
          Редагувати
        </button>
      ) : null}
    </article>
  )
}

export default function CategoryPage({
  mealCategories,
  typeCategories,
  dishes,
  defaultCategoryId,
  isAdmin,
  onUpdateDish,
}) {
  const { categoryId } = useParams()
  const selectedCategoryId = Number(categoryId)
  const [selectedDish, setSelectedDish] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editMealCategoryId, setEditMealCategoryId] = useState('')
  const [editTypeCategoryId, setEditTypeCategoryId] = useState('')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const allCategories = useMemo(
    () => [...mealCategories, ...typeCategories],
    [mealCategories, typeCategories],
  )

  const category = allCategories.find((item) => item.id === selectedCategoryId)

  if (!category && defaultCategoryId) {
    return <Navigate to={`/category/${defaultCategoryId}`} replace />
  }

  const filteredDishes = category
    ? dishes.filter(
        (dish) =>
          dish.mealCategoryId === selectedCategoryId ||
          dish.typeCategoryId === selectedCategoryId,
      )
    : []

  const isEmptyCategory = filteredDishes.length === 0

  useEffect(() => {
    if (!selectedDish && !isEditModalOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDish(null)
        setIsEditModalOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDish, isEditModalOpen])

  const closeModals = () => {
    setSelectedDish(null)
    setIsEditModalOpen(false)
    setEditError('')
  }

  const openEditModal = (dish) => {
    setSelectedDish(dish)
    setEditTitle(dish.title)
    setEditDescription(dish.description || '')
    setEditMealCategoryId(String(dish.mealCategoryId))
    setEditTypeCategoryId(String(dish.typeCategoryId))
    setEditError('')
    setIsEditModalOpen(true)
  }

  const submitEdit = async (event) => {
    event.preventDefault()

    if (!selectedDish || !onUpdateDish) {
      return
    }

    setEditError('')
    setIsSavingEdit(true)

    try {
      await onUpdateDish({
        id: selectedDish.id,
        title: editTitle,
        description: editDescription,
        mealCategoryId: Number(editMealCategoryId),
        typeCategoryId: Number(editTypeCategoryId),
      })

      closeModals()
    } catch (error) {
      setEditError(error.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <main className="category-page">
      <h1 className="category-title">{category?.name || 'Меню'}</h1>

      {isEmptyCategory ? (
        <section className="empty-category-state" aria-label={`Страви: ${category?.name || 'Меню'}`}>
          <p>Тут поки порожньо. Додайте перші страви у цю категорію.</p>
        </section>
      ) : (
        <section className="dish-grid" aria-label={`Страви: ${category?.name || 'Меню'}`}>
          {filteredDishes.map((dish) => (
            <DishCard
              key={`${selectedCategoryId}-${dish.id}`}
              title={dish.title}
              description={dish.description}
              isAdmin={isAdmin}
              onOpen={() => setSelectedDish(dish)}
              onEdit={() => openEditModal(dish)}
            />
          ))}
        </section>
      )}

      {selectedDish && !isEditModalOpen ? (
        <div
          className="dish-modal-overlay"
          role="presentation"
          onClick={closeModals}
        >
          <section
            className="dish-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Страва ${selectedDish.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dish-modal-close"
              aria-label="Закрити"
              onClick={closeModals}
            >
              ×
            </button>
            <h2>{selectedDish.title}</h2>
            <p>{selectedDish.description || 'Опис поки не додано'}</p>
            <div className="dish-modal-tags">
              <span>{selectedDish.mealCategoryName}</span>
              <span>{selectedDish.typeCategoryName}</span>
            </div>
          </section>
        </div>
      ) : null}

      {selectedDish && isEditModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeModals}>
          <section
            className="dish-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Редагування страви ${selectedDish.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dish-modal-close"
              aria-label="Закрити"
              onClick={closeModals}
            >
              ×
            </button>

            <h2>Редагувати страву</h2>

            <form className="dish-modal-form" onSubmit={submitEdit}>
              <label htmlFor="edit-dish-title">назва</label>
              <input
                id="edit-dish-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                required
              />

              <label htmlFor="edit-dish-description">опис</label>
              <textarea
                id="edit-dish-description"
                rows={3}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />

              <label htmlFor="edit-dish-meal-category">категорія за часом дня</label>
              <select
                id="edit-dish-meal-category"
                value={editMealCategoryId}
                onChange={(event) => setEditMealCategoryId(event.target.value)}
                required
              >
                {mealCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <label htmlFor="edit-dish-type-category">категорія за видом страви</label>
              <select
                id="edit-dish-type-category"
                value={editTypeCategoryId}
                onChange={(event) => setEditTypeCategoryId(event.target.value)}
                required
              >
                {typeCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              {editError ? <p className="state-message state-message--error">{editError}</p> : null}

              <div className="dish-modal-actions">
                <button type="button" className="dish-modal-secondary" onClick={closeModals}>
                  скасувати
                </button>
                <button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'зберігаю...' : 'зберегти зміни'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
