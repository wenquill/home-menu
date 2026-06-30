import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function getTomorrowDateString() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatMenuTitle(dateString) {
  const today = getTodayDateString()
  const tomorrow = getTomorrowDateString()

  if (dateString === today) {
    return 'меню на сьогодні'
  }

  if (dateString === tomorrow) {
    return 'меню на завтра'
  }

  const date = new Date(`${dateString}T00:00:00`)
  return `меню на ${new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)}`
}

function getMenuSpecialSourceLabel(sourceType) {
  if (sourceType === 'DELIVERY') {
    return 'доставка'
  }

  if (sourceType === 'STORE_READY') {
    return 'готове з магазину'
  }

  return 'інше'
}

function DishCard({ dish, onOpen, onRemoveFromMenu, onToggleCooked }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="dish-card dish-card--interactive dish-card--menu-item"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Відкрити страву ${dish.title}`}
    >
      <div className="dish-card-header">
        <h3>{dish.title}</h3>
      </div>
      <p>{dish.description || 'Опис поки не додано'}</p>
      {dish.components?.length ? (
        <div className="dish-card-components" aria-label="компоненти страви">
          {dish.components.map((component, index) => (
            <span key={`${dish.id}-menu-component-${index}`}>{component}</span>
          ))}
        </div>
      ) : null}
      <div className="dish-card-categories" aria-label="категорії страви">
        <span className="dish-card-categories-label">категорії:</span>
        <span>{dish.mealCategoryName}</span>
        <span className="dish-card-categories-separator">/</span>
        <span>{dish.typeCategoryName}</span>
        {dish.cookingTimeMinutes ? (
          <span className="dish-card-time" aria-label={`час приготування ${dish.cookingTimeMinutes} хвилин`} title="час приготування">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-1 3a1 1 0 012 0v4.38l2.45 2.45a1 1 0 01-1.42 1.42l-2.74-2.74A1 1 0 0111 12V7z" />
            </svg>
            <span>{dish.cookingTimeMinutes}</span>
          </span>
        ) : null}
      </div>
      <div className="menu-dish-card-actions">
        <button
          type="button"
          className={dish.isCooked ? 'menu-cooked-button menu-cooked-button--active' : 'menu-cooked-button'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleCooked()
          }}
        >
          {dish.isCooked ? '✓ приготовано' : 'позначити як приготоване'}
        </button>
        <button
          type="button"
          className="dish-remove-from-menu-button"
          onClick={(event) => {
            event.stopPropagation()
            onRemoveFromMenu()
          }}
        >
          прибрати
        </button>
      </div>
    </article>
  )
}

function SpecialPlanCard({ entry, onRemove }) {
  return (
    <article className="dish-card dish-card--menu-item" aria-label={`Альтернативний план ${entry.title}`}>
      <div className="dish-card-header">
        <h3>{entry.title}</h3>
      </div>
      <p>{entry.notes || 'Без додаткових нотаток'}</p>
      <div className="dish-card-categories" aria-label="тип альтернативного плану">
        <span className="dish-card-categories-label">тип:</span>
        <span>{getMenuSpecialSourceLabel(entry.sourceType)}</span>
      </div>
      <button
        type="button"
        className="dish-add-to-menu-button dish-remove-from-menu-button-alt"
        onClick={() => {
          onRemove()
        }}
      >
        прибрати з меню
      </button>
    </article>
  )
}

export default function MenuPage({
  onLoadMenuEntries,
  onRemoveMenuEntry,
  onToggleMenuEntryCooked,
  onLoadSpecialMenuEntries,
  onCreateSpecialMenuEntry,
  onDeleteSpecialMenuEntry,
}) {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [menuEntries, setMenuEntries] = useState([])
  const [specialEntries, setSpecialEntries] = useState([])
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)
  const [dishViewTab, setDishViewTab] = useState('details')
  const [copyMessage, setCopyMessage] = useState('')
  const [copyMessageTimeoutId, setCopyMessageTimeoutId] = useState(null)
  const [activeTab, setActiveTab] = useState('COOK')
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false)
  const [isSubmittingSpecial, setIsSubmittingSpecial] = useState(false)
  const [specialSourceType, setSpecialSourceType] = useState('DELIVERY')
  const [specialTitle, setSpecialTitle] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')

  const title = useMemo(() => formatMenuTitle(selectedDate), [selectedDate])
  const selectedDishComponents = selectedDish?.components || []

  const recipeSteps = useMemo(() => {
    const recipeText = String(selectedDish?.recipe || '').trim()

    if (!recipeText) {
      return []
    }

    const matches = [...recipeText.matchAll(/(?:^|\n)\s*(\d+)[.)]\s+([\s\S]*?)(?=(?:\n\s*\d+[.)]\s+)|$)/g)]
    const steps = matches
      .map((match) => String(match[2] || '').trim())
      .filter(Boolean)

    return steps.length >= 2 ? steps : []
  }, [selectedDish?.recipe])

  const hasStructuredRecipeSteps = recipeSteps.length > 0

  const hasAnyPlans = menuEntries.length > 0 || specialEntries.length > 0
  const isCookTab = activeTab === 'COOK'
  const visibleItemsCount = isCookTab ? menuEntries.length : specialEntries.length

  const loadEntries = async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const [entries, special] = await Promise.all([
        onLoadMenuEntries(selectedDate),
        onLoadSpecialMenuEntries?.(selectedDate),
      ])
      setMenuEntries(Array.isArray(entries) ? entries : [])
      setSpecialEntries(Array.isArray(special) ? special : [])
    } catch (error) {
      setPageError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setPageError('')

      try {
        const [entries, special] = await Promise.all([
          onLoadMenuEntries(selectedDate),
          onLoadSpecialMenuEntries?.(selectedDate),
        ])
        if (isActive) {
          setMenuEntries(Array.isArray(entries) ? entries : [])
          setSpecialEntries(Array.isArray(special) ? special : [])
        }
      } catch (error) {
        if (isActive) {
          setPageError(error.message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    run()

    return () => {
      isActive = false
    }
  }, [onLoadMenuEntries, onLoadSpecialMenuEntries, selectedDate])

  useEffect(() => {
    return () => {
      if (copyMessageTimeoutId) {
        window.clearTimeout(copyMessageTimeoutId)
      }
    }
  }, [copyMessageTimeoutId])

  useEffect(() => {
    if (!selectedDish) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDish(null)
        setDishViewTab('details')
        setCopyMessage('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDish])

  const closeModals = () => {
    setSelectedDish(null)
    setDishViewTab('details')
    setCopyMessage('')
    if (copyMessageTimeoutId) {
      window.clearTimeout(copyMessageTimeoutId)
      setCopyMessageTimeoutId(null)
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

  const removeFromMenu = async (menuEntryId) => {
    await onRemoveMenuEntry(menuEntryId)
    await loadEntries()
  }

  const toggleCooked = async (menuEntryId, currentIsCooked) => {
    if (!onToggleMenuEntryCooked) {
      return
    }

    const nextIsCooked = !currentIsCooked

    setMenuEntries((prev) =>
      prev.map((entry) =>
        entry.menuEntryId === menuEntryId
          ? { ...entry, isCooked: nextIsCooked }
          : entry,
      ),
    )

    try {
      await onToggleMenuEntryCooked(menuEntryId, nextIsCooked)
    } catch (_error) {
      setMenuEntries((prev) =>
        prev.map((entry) =>
          entry.menuEntryId === menuEntryId
            ? { ...entry, isCooked: currentIsCooked }
            : entry,
        ),
      )
    }
  }

  const closeSpecialModal = () => {
    setIsSpecialModalOpen(false)
    setSpecialSourceType('DELIVERY')
    setSpecialTitle('')
    setSpecialNotes('')
  }

  const addSpecialPlan = async (event) => {
    event.preventDefault()
    setPageError('')

    if (!specialTitle.trim()) {
      setPageError('Вкажіть назву альтернативного плану')
      return
    }

    setIsSubmittingSpecial(true)

    try {
      await onCreateSpecialMenuEntry?.({
        menuDate: selectedDate,
        sourceType: specialSourceType,
        title: specialTitle.trim(),
        notes: specialNotes.trim(),
      })
      closeSpecialModal()
      await loadEntries()
    } catch (error) {
      setPageError(error.message)
    } finally {
      setIsSubmittingSpecial(false)
    }
  }

  const removeSpecialPlan = async (id) => {
    setPageError('')

    try {
      await onDeleteSpecialMenuEntry?.(id)
      await loadEntries()
    } catch (error) {
      setPageError(error.message)
    }
  }

  return (
    <main className="category-page menu-page">
      <div className="menu-page-header">
        <label className="menu-date-label" htmlFor="menu-date-picker">
          обрати дату
        </label>
        <input
          id="menu-date-picker"
          className="menu-date-picker"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>

      <h1 className="category-title">{title}</h1>

      <div className="menu-tab-switch" role="tablist" aria-label="Тип меню">
        <button
          type="button"
          role="tab"
          aria-selected={isCookTab}
          className={isCookTab ? 'menu-tab-switch-button menu-tab-switch-button--active' : 'menu-tab-switch-button'}
          onClick={() => setActiveTab('COOK')}
        >
          готуємо
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isCookTab}
          className={!isCookTab ? 'menu-tab-switch-button menu-tab-switch-button--active' : 'menu-tab-switch-button'}
          onClick={() => setActiveTab('NO_COOK')}
        >
          не готуємо
        </button>
      </div>

      {pageError ? <p className="state-message state-message--error">{pageError}</p> : null}
      {isLoading ? <p className="state-message">завантаження меню...</p> : null}

      {!isLoading && !pageError && !hasAnyPlans ? (
        <section className="empty-category-state">
          <p>{isCookTab ? 'На цю дату ще немає запланованих страв.' : 'На цю дату ще немає запланованих альтернативних варіантів.'}</p>
        </section>
      ) : null}

      {!isLoading && !pageError && hasAnyPlans && visibleItemsCount === 0 ? (
        <section className="empty-category-state">
          <p>{isCookTab ? 'На цю дату ще немає запланованих страв.' : 'На цю дату ще немає запланованих альтернативних варіантів.'}</p>
        </section>
      ) : null}

      {!isLoading && visibleItemsCount > 0 ? (
        <section className="dish-grid" aria-label={`Меню на ${selectedDate}`}>
          {isCookTab
            ? menuEntries.map((dish) => (
              <DishCard
                key={`dish-${dish.menuEntryId}-${dish.id}`}
                dish={dish}
                onOpen={() => setSelectedDish(dish)}
                onRemoveFromMenu={() => {
                  void removeFromMenu(dish.menuEntryId)
                }}
                onToggleCooked={() => {
                  void toggleCooked(dish.menuEntryId, Boolean(dish.isCooked))
                }}
              />
            ))
            : specialEntries.map((entry) => (
              <SpecialPlanCard
                key={`special-${entry.id}`}
                entry={entry}
                onRemove={() => {
                  void removeSpecialPlan(entry.id)
                }}
              />
            ))}
        </section>
      ) : null}

      <div className="menu-bottom-actions" aria-label="Дії меню">
        {isCookTab ? (
          <button
            type="button"
            className="menu-link menu-link--button menu-page-action-button"
            onClick={() => navigate('/category/all')}
          >
            + додати страву
          </button>
        ) : (
          <button
            type="button"
            className="menu-link menu-link--button menu-page-action-button"
            onClick={() => setIsSpecialModalOpen(true)}
          >
            + додати альтернативний варіант
          </button>
        )}
      </div>

      {selectedDish ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeModals}>
          <section
            className="dish-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Страва ${selectedDish.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>{selectedDish.title}</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeModals}>
                ×
              </button>
            </div>
            <div className="menu-tab-switch dish-view-switch" role="tablist" aria-label="Вкладки страви">
              <button
                type="button"
                role="tab"
                aria-selected={dishViewTab === 'details'}
                className={dishViewTab === 'details' ? 'menu-tab-switch-button menu-tab-switch-button--active' : 'menu-tab-switch-button'}
                onClick={() => setDishViewTab('details')}
              >
                деталі
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dishViewTab === 'recipe'}
                className={dishViewTab === 'recipe' ? 'menu-tab-switch-button menu-tab-switch-button--active' : 'menu-tab-switch-button'}
                onClick={() => setDishViewTab('recipe')}
              >
                рецепт
              </button>
            </div>

            {dishViewTab === 'details' ? (
              <>
                <p>{selectedDish.description || 'Опис поки не додано'}</p>
                {selectedDish.cookingTimeMinutes ? <p>час приготування: {selectedDish.cookingTimeMinutes} хв</p> : null}
                {selectedDishComponents.length ? (
                  <div className="dish-components-block">
                    <p>компоненти:</p>
                    <ul>
                      {selectedDishComponents.map((component, index) => (
                        <li key={`${selectedDish.id}-menu-component-${index}`}>{component}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="dish-modal-tags">
                  <span>{selectedDish.mealCategoryName}</span>
                  <span>{selectedDish.typeCategoryName}</span>
                </div>
              </>
            ) : selectedDish.recipe ? (
              <div className="dish-recipe-block dish-recipe-block--tab">
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

                {hasStructuredRecipeSteps ? (
                  <ol className="dish-recipe-timeline" aria-label="Кроки рецепта">
                    {recipeSteps.map((stepText, index) => {
                      const stepNumber = index + 1

                      return (
                        <li key={`${selectedDish.id}-menu-recipe-step-${stepNumber}`} className="dish-recipe-timeline-step">
                          <div className="dish-recipe-timeline-rail" aria-hidden="true">
                            <span className="dish-recipe-timeline-node">{stepNumber}</span>
                          </div>
                          <div className="dish-recipe-timeline-content">
                            <p>{stepText}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <pre>{selectedDish.recipe}</pre>
                )}
                {copyMessage ? <p className="dish-copy-message">{copyMessage}</p> : null}
              </div>
            ) : (
              <p className="dish-recipe-empty">Рецепт поки не додано</p>
            )}
          </section>
        </div>
      ) : null}

      {isSpecialModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeSpecialModal}>
          <section
            className="dish-modal dish-modal--schedule"
            role="dialog"
            aria-modal="true"
            aria-label="Додати альтернативний план меню"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>альтернативний план</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeSpecialModal}>
                ×
              </button>
            </div>

            <form className="dish-modal-form" onSubmit={addSpecialPlan}>
              <label htmlFor="menu-special-type">тип</label>
              <select
                id="menu-special-type"
                value={specialSourceType}
                onChange={(event) => setSpecialSourceType(event.target.value)}
              >
                <option value="DELIVERY">доставка</option>
                <option value="STORE_READY">готове</option>
                <option value="OTHER">інше</option>
              </select>

              <label htmlFor="menu-special-title">назва / що саме їмо</label>
              <input
                id="menu-special-title"
                value={specialTitle}
                onChange={(event) => setSpecialTitle(event.target.value)}
                placeholder="наприклад: піца з доставки"
                maxLength={120}
                required
              />

              <label htmlFor="menu-special-notes">нотатки (необовʼязково)</label>
              <textarea
                id="menu-special-notes"
                rows={4}
                value={specialNotes}
                onChange={(event) => setSpecialNotes(event.target.value)}
                placeholder="додаткові деталі"
              />

              <div className="dish-modal-actions">
                <button type="button" className="dish-modal-secondary" onClick={closeSpecialModal}>
                  скасувати
                </button>
                <button type="submit" disabled={isSubmittingSpecial}>
                  {isSubmittingSpecial ? 'додаю...' : 'додати в меню'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
