import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

function DishCard({
  id,
  title,
  description,
  components,
  mealCategoryName,
  typeCategoryName,
  isAdmin,
  onOpen,
  onEdit,
  onDelete,
  onAddToMenu,
}) {
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
      {components?.length ? (
        <div className="dish-card-components" aria-label="компоненти страви">
          {components.map((component, index) => (
            <span key={`${id}-card-component-${index}`}>{component}</span>
          ))}
        </div>
      ) : null}
      <div className="dish-card-categories" aria-label="категорії страви">
        <span className="dish-card-categories-label">категорії:</span>
        <span>{mealCategoryName}</span>
        <span className="dish-card-categories-separator">/</span>
        <span>{typeCategoryName}</span>
      </div>
      {onAddToMenu ? (
        <button
          type="button"
          className="dish-add-to-menu-button"
          onClick={(event) => {
            event.stopPropagation()
            onAddToMenu()
          }}
        >
          додати до меню
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
  onDeleteDish,
  onGetDishById,
  onScheduleDishToMenu,
}) {
  const { categoryId } = useParams()
  const selectedCategoryId = Number(categoryId)
  const [selectedDish, setSelectedDish] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRecipe, setEditRecipe] = useState('')
  const [editComponents, setEditComponents] = useState([''])
  const [editMealCategoryId, setEditMealCategoryId] = useState('')
  const [editTypeCategoryId, setEditTypeCategoryId] = useState('')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [dishToDelete, setDishToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeletingDish, setIsDeletingDish] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const [copyMessageTimeoutId, setCopyMessageTimeoutId] = useState(null)
  const [menuScheduleDish, setMenuScheduleDish] = useState(null)
  const [menuScheduleMode, setMenuScheduleMode] = useState('today')
  const [menuScheduleDate, setMenuScheduleDate] = useState('')
  const [menuScheduleComponents, setMenuScheduleComponents] = useState([])
  const [menuScheduleError, setMenuScheduleError] = useState('')
  const [isSchedulingMenu, setIsSchedulingMenu] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState('')
  const [scheduleMessageTimeoutId, setScheduleMessageTimeoutId] = useState(null)

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
    if (!selectedDish && !isEditModalOpen && !dishToDelete && !menuScheduleDish) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDish(null)
        setIsEditModalOpen(false)
        setDishToDelete(null)
        setMenuScheduleDish(null)
        setDeleteError('')
        setMenuScheduleError('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDish, isEditModalOpen, dishToDelete, menuScheduleDish])

  useEffect(() => {
    return () => {
      if (copyMessageTimeoutId) {
        window.clearTimeout(copyMessageTimeoutId)
      }
    }
  }, [copyMessageTimeoutId])

  const closeModals = () => {
    setSelectedDish(null)
    setIsEditModalOpen(false)
    setDishToDelete(null)
    setEditError('')
    setDeleteError('')
    setCopyMessage('')
    setMenuScheduleDish(null)
    setMenuScheduleError('')
    setScheduleMessage('')
    if (copyMessageTimeoutId) {
      window.clearTimeout(copyMessageTimeoutId)
      setCopyMessageTimeoutId(null)
    }
    if (scheduleMessageTimeoutId) {
      window.clearTimeout(scheduleMessageTimeoutId)
      setScheduleMessageTimeoutId(null)
    }
  }

  const todayDateString = () => new Date().toISOString().slice(0, 10)

  const tomorrowDateString = () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return date.toISOString().slice(0, 10)
  }

  const openScheduleMenuModal = (dish) => {
    setMenuScheduleDish(dish)
    setMenuScheduleMode('today')
    setMenuScheduleDate(todayDateString())
    setMenuScheduleComponents(Array.isArray(dish?.components) ? dish.components : [])
    setMenuScheduleError('')
  }

  const closeScheduleMenuModal = () => {
    setMenuScheduleDish(null)
    setMenuScheduleComponents([])
    setMenuScheduleError('')
  }

  const toggleMenuScheduleComponent = (componentName) => {
    setMenuScheduleComponents((prev) => {
      const normalized = String(componentName || '').trim().toLowerCase()
      const exists = prev.some((item) => String(item || '').trim().toLowerCase() === normalized)

      if (exists) {
        return prev.filter((item) => String(item || '').trim().toLowerCase() !== normalized)
      }

      return [...prev, componentName]
    })
  }

  const scheduleDish = async (menuDate) => {
    if (!menuScheduleDish || !onScheduleDishToMenu) {
      return
    }

    setMenuScheduleError('')
    setIsSchedulingMenu(true)

    try {
      await onScheduleDishToMenu({
        dishId: menuScheduleDish.id,
        menuDate,
        components: menuScheduleComponents,
      })
      closeScheduleMenuModal()
      setScheduleMessage('додано до меню')

      if (scheduleMessageTimeoutId) {
        window.clearTimeout(scheduleMessageTimeoutId)
      }

      const timeoutId = window.setTimeout(() => {
        setScheduleMessage('')
        setScheduleMessageTimeoutId(null)
      }, 3000)

      setScheduleMessageTimeoutId(timeoutId)
    } catch (error) {
      setMenuScheduleError(error.message)
    } finally {
      setIsSchedulingMenu(false)
    }
  }

  const confirmCustomSchedule = async (event) => {
    event.preventDefault()

    if (!menuScheduleDate) {
      setMenuScheduleError('Оберіть дату')
      return
    }

    await scheduleDish(menuScheduleDate)
  }

  const loadDishDetails = async (dish) => {
    if (!dish || !onGetDishById) {
      return dish
    }

    try {
      const detailedDish = await onGetDishById(dish.id)
      return detailedDish || dish
    } catch (_error) {
      return dish
    }
  }

  const openDishModal = async (dish) => {
    setSelectedDish(dish)
    const detailedDish = await loadDishDetails(dish)
    setSelectedDish(detailedDish)
  }

  const openEditModal = async (dish) => {
    const detailedDish = await loadDishDetails(dish)

    setSelectedDish(detailedDish)
    setEditTitle(detailedDish.title)
    setEditDescription(detailedDish.description || '')
    setEditRecipe(detailedDish.recipe || '')
    setEditComponents(detailedDish.components?.length ? detailedDish.components : [''])
    setEditMealCategoryId(String(detailedDish.mealCategoryId))
    setEditTypeCategoryId(String(detailedDish.typeCategoryId))
    setEditError('')
    setIsEditModalOpen(true)
  }

  const updateEditComponentAt = (index, value) => {
    setEditComponents((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const addEditComponentField = () => {
    setEditComponents((prev) => [...prev, ''])
  }

  const removeEditComponentField = (index) => {
    setEditComponents((prev) => {
      if (prev.length === 1) {
        return ['']
      }

      return prev.filter((_item, idx) => idx !== index)
    })
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
        recipe: editRecipe,
        components: editComponents,
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

  const copyRecipeToClipboard = async () => {
    if (!selectedDish?.recipe) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedDish.recipe)
      setCopyMessage('рецепт скопійовано')

      if (copyMessageTimeoutId) {
        window.clearTimeout(copyMessageTimeoutId)
      }

      const timeoutId = window.setTimeout(() => {
        setCopyMessage('')
        setCopyMessageTimeoutId(null)
      }, 3000)

      setCopyMessageTimeoutId(timeoutId)
    } catch (_error) {
      setCopyMessage('не вдалося скопіювати рецепт')

      if (copyMessageTimeoutId) {
        window.clearTimeout(copyMessageTimeoutId)
      }

      const timeoutId = window.setTimeout(() => {
        setCopyMessage('')
        setCopyMessageTimeoutId(null)
      }, 3000)

      setCopyMessageTimeoutId(timeoutId)
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
              components={dish.components}
              mealCategoryName={dish.mealCategoryName}
              typeCategoryName={dish.typeCategoryName}
              isAdmin={isAdmin}
              onOpen={() => {
                void openDishModal(dish)
              }}
              onEdit={() => {
                void openEditModal(dish)
              }}
              onDelete={() => openDeleteModal(dish)}
              onAddToMenu={() => openScheduleMenuModal(dish)}
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
            {selectedDish.recipe ? (
              <div className="dish-recipe-block">
                <div className="dish-recipe-header">
                  <p>рецепт:</p>
                  <button
                    type="button"
                    className="dish-icon-button dish-icon-button--copy"
                    aria-label="Скопіювати рецепт"
                    title="Скопіювати рецепт"
                    onClick={copyRecipeToClipboard}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M16 1H6C4.9 1 4 1.9 4 3v12h2V3h10V1zm3 4H10c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16h-9V7h9v14z" />
                    </svg>
                  </button>
                </div>
                <pre>{selectedDish.recipe}</pre>
                {copyMessage ? <p className="dish-copy-message">{copyMessage}</p> : null}
              </div>
            ) : null}
            {selectedDish.components?.length ? (
              <div className="dish-components-block">
                <p>компоненти:</p>
                <ul>
                  {selectedDish.components.map((component, index) => (
                    <li key={`${selectedDish.id}-component-${index}`}>{component}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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

              <label htmlFor="edit-dish-recipe">рецепт</label>
              <textarea
                id="edit-dish-recipe"
                rows={5}
                value={editRecipe}
                onChange={(event) => setEditRecipe(event.target.value)}
              />

              <label>компоненти (інгредієнти)</label>
              <div className="component-list">
                {editComponents.map((component, index) => (
                  <div className="component-row" key={`modal-edit-component-${index}`}>
                    <input
                      value={component}
                      onChange={(event) => updateEditComponentAt(index, event.target.value)}
                      placeholder="наприклад, авокадо"
                    />
                    <button
                      type="button"
                      className="component-remove-btn"
                      onClick={() => removeEditComponentField(index)}
                      aria-label="видалити компонент"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="component-add-btn" onClick={addEditComponentField}>
                  + додати компонент
                </button>
              </div>

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

      {menuScheduleDish ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeScheduleMenuModal}>
          <section
            className="dish-modal dish-modal--schedule"
            role="dialog"
            aria-modal="true"
            aria-label={`Додати ${menuScheduleDish.title} до меню`}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeScheduleMenuModal}>
              ×
            </button>

            <h2>додати до меню</h2>
            <p className="dish-modal-warning">
              Оберіть, на яку дату запланувати страву <strong>{menuScheduleDish.title}</strong>.
            </p>

            {menuScheduleDish.components?.length ? (
              <div className="menu-schedule-components">
                <p>компоненти для цієї страви у меню:</p>
                <div className="menu-schedule-components-actions">
                  <button
                    type="button"
                    className="menu-schedule-components-action"
                    onClick={() => setMenuScheduleComponents(menuScheduleDish.components || [])}
                    disabled={isSchedulingMenu}
                  >
                    обрати всі
                  </button>
                  <button
                    type="button"
                    className="menu-schedule-components-action"
                    onClick={() => setMenuScheduleComponents([])}
                    disabled={isSchedulingMenu}
                  >
                    очистити
                  </button>
                </div>
                <div className="menu-schedule-components-list" aria-label="Вибір компонентів страви">
                  {menuScheduleDish.components.map((component, index) => {
                    const isChecked = menuScheduleComponents.some(
                      (selected) =>
                        String(selected || '').trim().toLowerCase() ===
                        String(component || '').trim().toLowerCase(),
                    )

                    return (
                      <label key={`${menuScheduleDish.id}-schedule-component-${index}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMenuScheduleComponent(component)}
                          disabled={isSchedulingMenu}
                        />
                        <span>{component}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {menuScheduleError ? <p className="state-message state-message--error">{menuScheduleError}</p> : null}

            <div className="menu-schedule-options">
              <button type="button" className="menu-schedule-option" onClick={() => void scheduleDish(todayDateString())} disabled={isSchedulingMenu}>
                сьогоднішнє меню
              </button>
              <button type="button" className="menu-schedule-option" onClick={() => void scheduleDish(tomorrowDateString())} disabled={isSchedulingMenu}>
                завтрашнє меню
              </button>
            </div>

            <div className="menu-schedule-custom">
              <button
                type="button"
                className={menuScheduleMode === 'custom' ? 'menu-schedule-option menu-schedule-option--active' : 'menu-schedule-option'}
                onClick={() => {
                  setMenuScheduleMode('custom')
                  setMenuScheduleError('')
                }}
                disabled={isSchedulingMenu}
              >
                вибрати дату
              </button>

              {menuScheduleMode === 'custom' ? (
                <form className="menu-schedule-form" onSubmit={confirmCustomSchedule}>
                  <input
                    type="date"
                    value={menuScheduleDate}
                    onChange={(event) => setMenuScheduleDate(event.target.value)}
                  />
                  <button type="submit" disabled={isSchedulingMenu}>
                    {isSchedulingMenu ? 'додаю...' : 'додати'}
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {scheduleMessage ? <p className="state-message menu-schedule-toast">{scheduleMessage}</p> : null}
    </main>
  )
}
