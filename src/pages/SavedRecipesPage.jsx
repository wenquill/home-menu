import { useEffect, useMemo, useState } from 'react'

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

export default function SavedRecipesPage({
  onLoadSavedRecipes,
  onCreateSavedRecipe,
  onUpdateSavedRecipe,
  onDeleteSavedRecipe,
  onToggleSavedRecipeTried,
}) {
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState(null)
  const [activeTriedRecipeId, setActiveTriedRecipeId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')

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

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedRecipe(null)
    setTitle('')
    setLink('')
    setNotes('')
    setFormError('')
  }

  const closeDeleteModal = () => {
    setRecipeToDelete(null)
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

  const openEditModal = (recipe) => {
    setSelectedRecipe(recipe)
    setTitle(recipe.title || '')
    setLink(recipe.link || '')
    setNotes(recipe.notes || '')
    setFormError('')
    setIsEditModalOpen(true)
  }

  const submitRecipeEdit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!selectedRecipe) {
      return
    }

    if (!title.trim()) {
      setFormError('Вкажіть назву рецепта')
      return
    }

    setIsSubmitting(true)

    try {
      const updated = await onUpdateSavedRecipe?.({
        id: selectedRecipe.id,
        title: title.trim(),
        link: link.trim(),
        notes: notes.trim(),
      })

      setRecipes((prev) => prev.map((recipe) => (recipe.id === updated.id ? updated : recipe)))
      closeEditModal()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteRecipe = async () => {
    if (!recipeToDelete) {
      return
    }

    setFormError('')
    setIsSubmitting(true)

    try {
      await onDeleteSavedRecipe?.(recipeToDelete.id)
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeToDelete.id))
      if (selectedRecipe?.id === recipeToDelete.id) {
        setSelectedRecipe(null)
      }
      closeDeleteModal()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleRecipeTried = async (recipe) => {
    if (!recipe || !onToggleSavedRecipeTried) {
      return
    }

    setFormError('')
    setActiveTriedRecipeId(recipe.id)

    try {
      const updated = await onToggleSavedRecipeTried(recipe.id, !Boolean(recipe.isTried))
      setRecipes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedRecipe((prev) => (prev && prev.id === updated.id ? updated : prev))
    } catch (error) {
      setFormError(error.message)
    } finally {
      setActiveTriedRecipeId(null)
    }
  }

  const normalizedSearch = searchText.trim().toLowerCase()

  const visibleRecipes = useMemo(() => {
    const filtered = normalizedSearch
      ? recipes.filter((recipe) => {
          const titleValue = String(recipe.title || '').toLowerCase()
          const notesValue = String(recipe.notes || '').toLowerCase()
          const linkValue = String(recipe.link || '').toLowerCase()

          return (
            titleValue.includes(normalizedSearch) ||
            notesValue.includes(normalizedSearch) ||
            linkValue.includes(normalizedSearch)
          )
        })
      : recipes

    const list = [...filtered]

    switch (sortBy) {
      case 'date-asc':
        return list.sort((a, b) => a.id - b.id)
      case 'title-asc':
        return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'uk'))
      case 'title-desc':
        return list.sort((a, b) => String(b.title || '').localeCompare(String(a.title || ''), 'uk'))
      case 'link-first':
        return list.sort((a, b) => Number(Boolean(b.link)) - Number(Boolean(a.link)))
      case 'link-last':
        return list.sort((a, b) => Number(Boolean(a.link)) - Number(Boolean(b.link)))
      case 'date-desc':
      default:
        return list.sort((a, b) => b.id - a.id)
    }
  }, [recipes, normalizedSearch, sortBy])

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

      <div className="dish-search" role="search">
        <input
          type="search"
          placeholder="пошук: назва, посилання, нотатки"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <select aria-label="Сортування рецептів" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="date-desc">спочатку нові</option>
          <option value="date-asc">спочатку старі</option>
          <option value="title-asc">назва: а-я</option>
          <option value="title-desc">назва: я-а</option>
          <option value="link-first">спочатку з посиланням</option>
          <option value="link-last">спочатку без посилання</option>
        </select>
      </div>

      {pageError ? <p className="state-message state-message--error">{pageError}</p> : null}
      {isLoading ? <p className="state-message">завантаження рецептів...</p> : null}

      {!isLoading && !pageError && visibleRecipes.length === 0 ? (
        <section className="empty-category-state">
          <p>{normalizedSearch ? 'За запитом нічого не знайдено.' : 'У вас ще немає збережених рецептів.'}</p>
        </section>
      ) : null}

      {!isLoading && visibleRecipes.length > 0 ? (
        <section className="saved-recipes-grid" aria-label="Список збережених рецептів">
          {visibleRecipes.map((recipe) => (
            (() => {
              const corner = cornerOffsets[recipe.id % cornerOffsets.length]
              const spotSize = spotSizes[(recipe.id * 7) % spotSizes.length]

              return (
                <article
                  key={recipe.id}
                  className={Boolean(recipe.isTried) ? 'saved-recipe-card saved-recipe-card--tried' : 'saved-recipe-card'}
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
                  <div className="dish-card-header">
                    <h3>{recipe.title}</h3>
                    <div className="dish-card-actions">
                      <button
                        type="button"
                        className={Boolean(recipe.isTried)
                          ? 'dish-icon-button saved-recipe-status-button saved-recipe-status-button--active'
                          : 'dish-icon-button saved-recipe-status-button'}
                        aria-label={Boolean(recipe.isTried) ? 'Позначити як не виконано' : 'Позначити як виконано'}
                        title={Boolean(recipe.isTried) ? 'Спробовано' : 'Не спробовано'}
                        disabled={activeTriedRecipeId === recipe.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          void toggleRecipeTried(recipe)
                        }}
                      >
                        {Boolean(recipe.isTried) ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m8.5 12.4 2.4 2.5 4.8-5.2" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className="dish-icon-button"
                        aria-label="Редагувати"
                        title="Редагувати"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditModal(recipe)
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="dish-icon-button"
                        aria-label="Видалити"
                        title="Видалити"
                        onClick={(event) => {
                          event.stopPropagation()
                          setRecipeToDelete(recipe)
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 10v7" />
                          <path d="M14 10v7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {recipe.link ? <p className="saved-recipe-link-preview">{recipe.link}</p> : null}
                  {recipe.notes ? <p>{recipe.notes}</p> : <p className="saved-recipe-muted">без нотаток</p>}
                  <time>{formatDate(recipe.createdAt)}</time>
                  {Boolean(recipe.isTried) ? <p className="saved-recipe-tried-note">(виконано)</p> : null}
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

      {selectedRecipe && !isEditModalOpen && !recipeToDelete ? (
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

            <p className="saved-recipe-muted">
              статус: {Boolean(selectedRecipe.isTried) ? 'виконано' : 'не виконано'}
            </p>

          </section>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeEditModal}>
          <section
            className="dish-modal dish-modal--edit"
            role="dialog"
            aria-modal="true"
            aria-label="Редагувати рецепт"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>редагувати рецепт</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <form className="dish-modal-form" onSubmit={submitRecipeEdit}>
              <label htmlFor="edit-saved-recipe-title">назва</label>
              <input
                id="edit-saved-recipe-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />

              <label htmlFor="edit-saved-recipe-link">посилання</label>
              <input
                id="edit-saved-recipe-link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
              />

              <label htmlFor="edit-saved-recipe-notes">нотатки</label>
              <textarea
                id="edit-saved-recipe-notes"
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="додаткові замітки"
              />

              {formError ? <p className="state-message state-message--error">{formError}</p> : null}

              <div className="dish-modal-actions">
                <button type="button" className="dish-modal-secondary" onClick={closeEditModal}>
                  скасувати
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'зберігаю...' : 'зберегти зміни'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {recipeToDelete ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <section
            className="dish-modal dish-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label={`Видалити рецепт ${recipeToDelete.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>видалити рецепт?</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeDeleteModal}>
                ×
              </button>
            </div>

            <p className="dish-modal-warning">
              Рецепт <strong>{recipeToDelete.title}</strong> буде видалено назавжди.
            </p>

            {formError ? <p className="state-message state-message--error">{formError}</p> : null}

            <div className="dish-modal-actions dish-modal-actions--confirm">
              <button type="button" className="dish-modal-secondary" onClick={closeDeleteModal}>
                скасувати
              </button>
              <button type="button" className="dish-modal-danger" onClick={() => void deleteRecipe()} disabled={isSubmitting}>
                {isSubmitting ? 'видаляю...' : 'видалити'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </main>
  )
}
