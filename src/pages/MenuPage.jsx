import { useEffect, useMemo, useState } from 'react'

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

function DishCard({ dish, onOpen, onRemoveFromMenu }) {
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
      </div>
      <button
        type="button"
        className="dish-add-to-menu-button dish-remove-from-menu-button"
        onClick={(event) => {
          event.stopPropagation()
          onRemoveFromMenu()
        }}
      >
        прибрати з меню
      </button>
    </article>
  )
}

export default function MenuPage({ onLoadMenuEntries, onRemoveMenuEntry }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [menuEntries, setMenuEntries] = useState([])
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [copyMessageTimeoutId, setCopyMessageTimeoutId] = useState(null)

  const title = useMemo(() => formatMenuTitle(selectedDate), [selectedDate])

  const loadEntries = async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const entries = await onLoadMenuEntries(selectedDate)
      setMenuEntries(entries)
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
        const entries = await onLoadMenuEntries(selectedDate)
        if (isActive) {
          setMenuEntries(entries)
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
  }, [onLoadMenuEntries, selectedDate])

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
        setCopyMessage('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDish])

  const closeModals = () => {
    setSelectedDish(null)
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

  const selectedDishComponents = selectedDish?.components || []

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

      {pageError ? <p className="state-message state-message--error">{pageError}</p> : null}
      {isLoading ? <p className="state-message">завантаження меню...</p> : null}

      {!isLoading && !pageError && menuEntries.length === 0 ? (
        <section className="empty-category-state">
          <p>На цю дату ще не додано жодної страви.</p>
        </section>
      ) : null}

      {!isLoading && menuEntries.length > 0 ? (
        <section className="dish-grid" aria-label={`Меню на ${selectedDate}`}>
          {menuEntries.map((dish) => (
            <DishCard
              key={`${dish.menuEntryId}-${dish.id}`}
              dish={dish}
              onOpen={() => setSelectedDish(dish)}
              onRemoveFromMenu={() => {
                void removeFromMenu(dish.menuEntryId)
              }}
            />
          ))}
        </section>
      ) : null}

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
          </section>
        </div>
      ) : null}
    </main>
  )
}
