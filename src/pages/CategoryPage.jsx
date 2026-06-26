import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

function DishCard({ id, title, description, isAdmin, onOpen, onEdit, onDelete }) {
  const cornerOffsets = [
    { x: '10%', y: '10%' },
    { x: '90%', y: '10%' },
    { x: '10%', y: '90%' },
    { x: '90%', y: '90%' },
  ]
  const spotSizes = ['34%', '40%', '46%', '52%']
  const corner = cornerOffsets[id % cornerOffsets.length]
  const spotSize = spotSizes[(id * 7) % spotSizes.length]

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="dish-card dish-card--interactive"
      style={{
        '--dish-spot-x': corner.x,
        '--dish-spot-y': corner.y,
        '--dish-spot-size': spotSize,
      }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Відкрити страву ${title}`}
    >
      <div className="dish-card-header">
        <h3>{title}</h3>
        {isAdmin ? (
          <div className="dish-card-actions">
            <button
              type="button"
              className="dish-icon-button"
              aria-label="Редагувати"
              title="Редагувати"
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 17.25V21h3.75L18.81 8.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 5.63a1 1 0 000-1.41l-1.93-1.93a1 1 0 00-1.41 0l-1.5 1.5 3.75 3.75 1.09-1.09z" />
              </svg>
            </button>
            <button
              type="button"
              className="dish-icon-button"
              aria-label="Видалити"
              title="Видалити"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8zm-1 10h12l1-13H5l1 13z" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
      <p>{description}</p>
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
  onDeleteDish,
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
  const [dishToDelete, setDishToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeletingDish, setIsDeletingDish] = useState(false)

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
    if (!selectedDish && !isEditModalOpen && !dishToDelete) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDish(null)
        setIsEditModalOpen(false)
        setDishToDelete(null)
        setDeleteError('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDish, isEditModalOpen, dishToDelete])

  const closeModals = () => {
    setSelectedDish(null)
    setIsEditModalOpen(false)
    setDishToDelete(null)
    setEditError('')
    setDeleteError('')
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

  const openDeleteModal = (dish) => {
    if (!dish) {
      return
    }

    setDishToDelete(dish)
    setDeleteError('')
  }

  const deleteCurrentDish = async () => {
    if (!dishToDelete || !onDeleteDish) {
      return
    }

    setDeleteError('')
    setIsDeletingDish(true)

    try {
      await onDeleteDish(dishToDelete.id)
      closeModals()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setIsDeletingDish(false)
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
              id={dish.id}
              title={dish.title}
              description={dish.description}
              isAdmin={isAdmin}
              onOpen={() => setSelectedDish(dish)}
              onEdit={() => openEditModal(dish)}
              onDelete={() => openDeleteModal(dish)}
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
                    {item.name.toLowerCase()}
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
                    {item.name.toLowerCase()}
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

      {dishToDelete ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeModals}>
          <section
            className="dish-modal dish-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label={`Видалити страву ${dishToDelete.title}`}
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

            <h2>Видалити страву?</h2>
            <p className="dish-modal-warning">
              Страва <strong>{dishToDelete.title}</strong> буде видалена назавжди.
            </p>

            {deleteError ? <p className="state-message state-message--error">{deleteError}</p> : null}

            <div className="dish-modal-actions dish-modal-actions--confirm">
              <button type="button" className="dish-modal-secondary" onClick={closeModals}>
                скасувати
              </button>
              <button type="button" className="dish-modal-danger" onClick={deleteCurrentDish} disabled={isDeletingDish}>
                {isDeletingDish ? 'видаляю...' : 'видалити'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
