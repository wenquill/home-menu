import { useEffect, useState } from 'react'

function formatDate(dateValue) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export default function SavedRecipesPage({ onLoadSavedRecipes, onCreateSavedRecipe }) {
  const cornerOffsets = [
    { x: '10%', y: '10%' },
    { x: '90%', y: '10%' },
    { x: '10%', y: '90%' },
    { x: '90%', y: '90%' },
  ]
  const spotSizes = ['34%', '40%', '46%', '52%']

  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedRecipe, setSelectedRecipe] = useState(null)

  const loadRecipes = async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const loaded = await onLoadSavedRecipes?.()
      setRecipes(Array.isArray(loaded) ? loaded : [])
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
        const loaded = await onLoadSavedRecipes?.()
        if (isActive) {
          setRecipes(Array.isArray(loaded) ? loaded : [])
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
  }, [onLoadSavedRecipes])

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setTitle('')
    setLink('')
    setNotes('')
    setFormError('')
  }

  const submitRecipe = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!title.trim()) {
      setFormError('Вкажіть назву рецепта')
      return
    }

    setIsSubmitting(true)

    try {
      const created = await onCreateSavedRecipe?.({
        title: title.trim(),
        link: link.trim(),
        notes: notes.trim(),
      })

      setRecipes((prev) => [created, ...prev])
      closeAddModal()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <div className="saved-recipes-header">
        <h1 className="category-title">збережені рецепти</h1>
        <div className="saved-recipes-header-actions">
          <button
            type="button"
            className="menu-link menu-link--button saved-recipes-header-button"
            onClick={() => setIsAddModalOpen(true)}
          >
            + додати рецепт
          </button>
          <button
            type="button"
            className="menu-link menu-link--button saved-recipes-header-button"
            onClick={() => void loadRecipes()}
          >
            оновити список
          </button>
        </div>
      </div>

      {pageError ? <p className="state-message state-message--error">{pageError}</p> : null}
      {isLoading ? <p className="state-message">завантаження рецептів...</p> : null}

      {!isLoading && !pageError && recipes.length === 0 ? (
        <section className="empty-category-state">
          <p>У вас ще немає збережених рецептів.</p>
        </section>
      ) : null}

      {!isLoading && recipes.length > 0 ? (
        <section className="saved-recipes-grid" aria-label="Список збережених рецептів">
          {recipes.map((recipe) => (
            (() => {
              const corner = cornerOffsets[recipe.id % cornerOffsets.length]
              const spotSize = spotSizes[(recipe.id * 7) % spotSizes.length]

              return (
                <article
                  key={recipe.id}
                  className="saved-recipe-card"
                  style={{
                    '--dish-spot-x': corner.x,
                    '--dish-spot-y': corner.y,
                    '--dish-spot-size': spotSize,
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRecipe(recipe)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedRecipe(recipe)
                    }
                  }}
                >
                  <h3>{recipe.title}</h3>
                  {recipe.link ? <p className="saved-recipe-link-preview">{recipe.link}</p> : null}
                  {recipe.notes ? <p>{recipe.notes}</p> : <p className="saved-recipe-muted">без нотаток</p>}
                  <time>{formatDate(recipe.createdAt)}</time>
                </article>
              )
            })()
          ))}
        </section>
      ) : null}

      {isAddModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeAddModal}>
          <section
            className="dish-modal dish-modal--edit"
            role="dialog"
            aria-modal="true"
            aria-label="Додати рецепт"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>додати рецепт</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeAddModal}>
                ×
              </button>
            </div>

            <form className="dish-modal-form" onSubmit={submitRecipe}>
              <label htmlFor="saved-recipe-title">назва</label>
              <input
                id="saved-recipe-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />

              <label htmlFor="saved-recipe-link">посилання</label>
              <input
                id="saved-recipe-link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
              />

              <label htmlFor="saved-recipe-notes">нотатки</label>
              <textarea
                id="saved-recipe-notes"
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="додаткові замітки"
              />

              {formError ? <p className="state-message state-message--error">{formError}</p> : null}

              <div className="dish-modal-actions">
                <button type="button" className="dish-modal-secondary" onClick={closeAddModal}>
                  скасувати
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'зберігаю...' : 'зберегти'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedRecipe ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setSelectedRecipe(null)}>
          <section
            className="dish-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Рецепт ${selectedRecipe.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>{selectedRecipe.title}</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setSelectedRecipe(null)}
              >
                ×
              </button>
            </div>

            {selectedRecipe.link ? (
              <p>
                посилання:{' '}
                <a href={selectedRecipe.link} target="_blank" rel="noreferrer" className="saved-recipe-link-active">
                  {selectedRecipe.link}
                </a>
              </p>
            ) : (
              <p className="saved-recipe-muted">посилання не додано</p>
            )}

            {selectedRecipe.notes ? (
              <div className="dish-recipe-block">
                <p>нотатки:</p>
                <pre>{selectedRecipe.notes}</pre>
              </div>
            ) : (
              <p className="saved-recipe-muted">нотатки не додано</p>
            )}
          </section>
        </div>
      ) : null}

    </main>
  )
}
