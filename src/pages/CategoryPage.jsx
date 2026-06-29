import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

function DishCard({
  id,
  title,
  description,
  cookingTimeMinutes,
  components,
  mealCategoryName,
  typeCategoryName,
  isFavorite,
  isAdmin,
  onOpen,
  onToggleFavorite,
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
        <div className="dish-card-actions">
          <button
            type="button"
            className={isFavorite ? 'dish-icon-button dish-icon-button--favorite dish-icon-button--active' : 'dish-icon-button dish-icon-button--favorite'}
            aria-label={isFavorite ? 'Видалити з улюблених' : 'Додати в улюблені'}
            title={isFavorite ? 'Видалити з улюблених' : 'Додати в улюблені'}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite?.()
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          {isAdmin ? (
            <>
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
                  onDelete()
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
            </>
          ) : null}
        </div>
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
        {cookingTimeMinutes ? (
          <span className="dish-card-time" aria-label={`час приготування ${cookingTimeMinutes} хвилин`} title="час приготування">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-1 3a1 1 0 012 0v4.38l2.45 2.45a1 1 0 01-1.42 1.42l-2.74-2.74A1 1 0 0111 12V7z" />
            </svg>
            <span>{cookingTimeMinutes}</span>
          </span>
        ) : null}
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
  viewMode = 'category',
  mealCategories,
  typeCategories,
  dishes,
  defaultCategoryId,
  favoriteDishIds = [],
  onToggleFavoriteDish,
  isAdmin,
  onUpdateDish,
  onDeleteDish,
  onGetDishById,
  onGenerateDishRecipe,
  onScheduleDishToMenu,
}) {
  const ITEMS_PER_PAGE = 8
  const { categoryId } = useParams()
  const isFavoritesView = viewMode === 'favorites'
  const isAllDishesView = !isFavoritesView && categoryId === 'all'
  const selectedCategoryId = Number(categoryId)
  const [selectedDish, setSelectedDish] = useState(null)
  const [dishViewTab, setDishViewTab] = useState('details')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRecipe, setEditRecipe] = useState('')
  const [editCookingTime, setEditCookingTime] = useState('')
  const [editComponents, setEditComponents] = useState([''])
  const [editMealCategoryId, setEditMealCategoryId] = useState('')
  const [editTypeCategoryId, setEditTypeCategoryId] = useState('')
  const [editStep, setEditStep] = useState(1)
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isGeneratingEditRecipe, setIsGeneratingEditRecipe] = useState(false)
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
  const [favoriteToastMessage, setFavoriteToastMessage] = useState('')
  const [favoriteToastTimeoutId, setFavoriteToastTimeoutId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const allCategories = useMemo(
    () => [...mealCategories, ...typeCategories],
    [mealCategories, typeCategories],
  )
  const favoriteDishIdSet = useMemo(
    () => new Set((favoriteDishIds || []).map((id) => Number(id))),
    [favoriteDishIds],
  )

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

  const category = allCategories.find((item) => item.id === selectedCategoryId)

  if (!isFavoritesView && !isAllDishesView && !category && defaultCategoryId) {
    return <Navigate to={`/category/${defaultCategoryId}`} replace />
  }

  const filteredDishes = isFavoritesView
    ? dishes.filter((dish) => favoriteDishIdSet.has(dish.id))
    : isAllDishesView
    ? dishes
    : category
    ? dishes.filter(
        (dish) =>
          dish.mealCategoryId === selectedCategoryId ||
          dish.typeCategoryId === selectedCategoryId,
      )
    : []

  const categoryLabel = isFavoritesView ? 'улюблені страви' : isAllDishesView ? 'усі страви' : category?.name || 'меню'
  const dishListAriaLabel = `Страви: ${categoryLabel}`
  const dishKeyPrefix = isFavoritesView ? 'favorites' : isAllDishesView ? 'all' : String(selectedCategoryId)
  const normalizedSearch = searchText.trim().toLowerCase()

  const visibleDishes = normalizedSearch
    ? filteredDishes.filter((dish) => {
        const title = String(dish.title || '').toLowerCase()
        const description = String(dish.description || '').toLowerCase()
        const components = Array.isArray(dish.components)
          ? dish.components.join(' ').toLowerCase()
          : ''

        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch) ||
          components.includes(normalizedSearch)
        )
      })
    : filteredDishes

  const sortedVisibleDishes = useMemo(() => {
    const list = [...visibleDishes]

    switch (sortBy) {
      case 'oldest':
        return list.sort((a, b) => a.id - b.id)
      case 'name-asc':
        return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'uk'))
      case 'name-desc':
        return list.sort((a, b) => String(b.title || '').localeCompare(String(a.title || ''), 'uk'))
      case 'time-asc':
        return list.sort((a, b) => {
          const timeA = Number.isFinite(Number(a.cookingTimeMinutes)) ? Number(a.cookingTimeMinutes) : Number.POSITIVE_INFINITY
          const timeB = Number.isFinite(Number(b.cookingTimeMinutes)) ? Number(b.cookingTimeMinutes) : Number.POSITIVE_INFINITY
          return timeA - timeB
        })
      case 'time-desc':
        return list.sort((a, b) => {
          const timeA = Number.isFinite(Number(a.cookingTimeMinutes)) ? Number(a.cookingTimeMinutes) : Number.NEGATIVE_INFINITY
          const timeB = Number.isFinite(Number(b.cookingTimeMinutes)) ? Number(b.cookingTimeMinutes) : Number.NEGATIVE_INFINITY
          return timeB - timeA
        })
      case 'newest':
      default:
        return list.sort((a, b) => b.id - a.id)
    }
  }, [visibleDishes, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedVisibleDishes.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [categoryId, viewMode, normalizedSearch, sortBy])

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) {
        return totalPages
      }

      if (prev < 1) {
        return 1
      }

      return prev
    })
  }, [totalPages])

  const paginatedDishes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedVisibleDishes.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedVisibleDishes, currentPage])

  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_value, index) => index + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5]
    }

    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  }, [currentPage, totalPages])

  const isEmptyCategory = sortedVisibleDishes.length === 0

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

  useEffect(() => {
    return () => {
      if (favoriteToastTimeoutId) {
        window.clearTimeout(favoriteToastTimeoutId)
      }
    }
  }, [favoriteToastTimeoutId])

  const closeModals = () => {
    setSelectedDish(null)
    setDishViewTab('details')
    setIsEditModalOpen(false)
    setEditStep(1)
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
    setDishViewTab('details')
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
    setEditCookingTime(detailedDish.cookingTimeMinutes ? String(detailedDish.cookingTimeMinutes) : '')
    setEditComponents(detailedDish.components?.length ? detailedDish.components : [''])
    setEditMealCategoryId(String(detailedDish.mealCategoryId))
    setEditTypeCategoryId(String(detailedDish.typeCategoryId))
    setEditStep(1)
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

  const generateEditRecipeWithAi = async () => {
    const normalizedTitle = editTitle.trim()
    const normalizedDescription = editDescription.trim()
    const normalizedComponents = editComponents.map((item) => String(item || '').trim()).filter(Boolean)

    if (!normalizedTitle) {
      setEditError('Для AI-генерації спочатку вкажіть назву страви')
      return
    }

    if (normalizedComponents.length === 0) {
      setEditError('Для AI-генерації додайте хоча б один інгредієнт')
      return
    }

    if (!onGenerateDishRecipe) {
      setEditError('AI-генерація тимчасово недоступна')
      return
    }

    setEditError('')
    setIsGeneratingEditRecipe(true)

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

      setEditRecipe(recipeText)

      const apiMinutes = Number(generated?.cookingTimeMinutes)
      const fallbackMinutes = extractMinutesFromRecipeText(recipeText)
      const nextMinutes = Number.isInteger(apiMinutes) && apiMinutes > 0 ? apiMinutes : fallbackMinutes

      if (nextMinutes) {
        setEditCookingTime(String(nextMinutes))
      }
    } catch (error) {
      setEditError(error.message)
    } finally {
      setIsGeneratingEditRecipe(false)
    }
  }

  const goToEditStepTwo = () => {
    setEditError('')
    setEditStep(2)
  }

  const goToEditStepOne = () => {
    setEditError('')
    setEditStep(1)
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
        cookingTimeMinutes: editCookingTime === '' ? null : Number(editCookingTime),
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

  const showFavoriteToast = (message) => {
    setFavoriteToastMessage(message)

    if (favoriteToastTimeoutId) {
      window.clearTimeout(favoriteToastTimeoutId)
    }

    const timeoutId = window.setTimeout(() => {
      setFavoriteToastMessage('')
      setFavoriteToastTimeoutId(null)
    }, 2800)

    setFavoriteToastTimeoutId(timeoutId)
  }

  const toggleFavorite = async (dishId, isFavorite) => {
    if (!onToggleFavoriteDish) {
      return
    }

    try {
      const result = await onToggleFavoriteDish(dishId, isFavorite)

      if (result?.added) {
        showFavoriteToast('страву додано в улюблені')
      }
    } catch (_error) {
      // Silent fail here to avoid blocking modal/card interactions.
    }
  }

  const isEditStepOneReady = editTitle.trim().length > 0

  return (
    <main className="category-page">
      <h1 className="category-title">{categoryLabel}</h1>

      <div className="dish-search" role="search">
        <input
          id="dish-search-input"
          type="search"
          placeholder="пошук: назва, опис, компоненти"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <select
          aria-label="Сортування страв"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="newest">спочатку нові</option>
          <option value="oldest">спочатку старі</option>
          <option value="name-asc">назва: а-я</option>
          <option value="name-desc">назва: я-а</option>
          <option value="time-asc">час: менший-більший</option>
          <option value="time-desc">час: більший-менший</option>
        </select>
      </div>

      {isEmptyCategory ? (
        <section className="empty-category-state" aria-label={dishListAriaLabel}>
          {normalizedSearch ? (
            <p>За запитом нічого не знайдено. Спробуйте інший текст.</p>
          ) : (
            <p>Тут поки порожньо. Додайте перші страви у цю категорію.</p>
          )}
        </section>
      ) : (
        <section className="dish-grid" aria-label={dishListAriaLabel}>
          {paginatedDishes.map((dish) => (
            <DishCard
              key={`${dishKeyPrefix}-${dish.id}`}
              id={dish.id}
              title={dish.title}
              description={dish.description}
              cookingTimeMinutes={dish.cookingTimeMinutes}
              components={dish.components}
              mealCategoryName={dish.mealCategoryName}
              typeCategoryName={dish.typeCategoryName}
              isFavorite={favoriteDishIdSet.has(dish.id)}
              isAdmin={isAdmin}
              onOpen={() => {
                void openDishModal(dish)
              }}
              onToggleFavorite={() => {
                void toggleFavorite(dish.id, favoriteDishIdSet.has(dish.id))
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

      {!isEmptyCategory && totalPages > 1 ? (
        <nav className="dish-pagination" aria-label="Пагінація страв">
          <button
            type="button"
            className="dish-pagination-button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            попередня
          </button>

          <div className="dish-pagination-pages">
            {paginationPages.map((page) => (
              <button
                key={`page-${page}`}
                type="button"
                className={page === currentPage ? 'dish-pagination-button dish-pagination-button--active' : 'dish-pagination-button'}
                onClick={() => setCurrentPage(page)}
                aria-label={`Сторінка ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="dish-pagination-button"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            наступна
          </button>
        </nav>
      ) : null}

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
            <div className="dish-modal-header">
              <h2>{selectedDish.title}</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={closeModals}
              >
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
              {selectedDish.description && (
                <p>{selectedDish.description}</p>
              )}
                {selectedDish.cookingTimeMinutes ? <p>час приготування: {selectedDish.cookingTimeMinutes} хв</p> : null}
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
                      const isLast = stepNumber === recipeSteps.length

                      return (
                        <li key={`${selectedDish.id}-recipe-step-${stepNumber}`} className="dish-recipe-timeline-step">
                          <div className="dish-recipe-timeline-rail" aria-hidden="true">
                            <span className="dish-recipe-timeline-node">{stepNumber}</span>
                            {!isLast ? <span className="dish-recipe-timeline-line" /> : null}
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

      {selectedDish && isEditModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeModals}>
          <section
            className="dish-modal dish-modal--edit"
            role="dialog"
            aria-modal="true"
            aria-label={`Редагування страви ${selectedDish.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>Редагувати страву</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={closeModals}
              >
                ×
              </button>
            </div>

            <form className="admin-form admin-form-progress" onSubmit={submitEdit}>
              <div className="add-dish-progress" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={editStep}>
                <div className="add-dish-progress-line" aria-hidden="true">
                  <span className={`add-dish-progress-node ${editStep >= 1 ? 'is-complete' : ''} ${editStep === 1 ? 'is-active' : ''}`}>
                    1
                  </span>
                  <span className={`add-dish-progress-node ${editStep >= 2 ? 'is-complete' : ''} ${editStep === 2 ? 'is-active' : ''}`}>
                    2
                  </span>
                  <span className="add-dish-progress-fill" style={{ width: editStep === 1 ? '0%' : '100%' }} />
                </div>
                <div className="add-dish-progress-head">
                  <span className={editStep === 1 ? 'is-active' : ''}>Основа</span>
                  <span className={editStep === 2 ? 'is-active' : ''}>Рецепт</span>
                </div>
              </div>

              {editStep === 1 ? (
                <>
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

                  <div className="admin-form-actions">
                    <button type="button" className="dish-modal-secondary" onClick={closeModals}>
                      скасувати
                    </button>
                    <button type="button" onClick={goToEditStepTwo} disabled={!isEditStepOneReady}>
                      далі
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-field-heading">
                    <label htmlFor="edit-dish-recipe">рецепт</label>
                    <button
                      type="button"
                      className="admin-ai-generate-btn"
                      onClick={generateEditRecipeWithAi}
                      disabled={isSavingEdit || isGeneratingEditRecipe}
                    >
                      {isGeneratingEditRecipe ? 'генерую...' : 'згенерувати рецепт'}
                    </button>
                  </div>
                  <p className="admin-ai-hint">AI може автоматично згенерувати кроки і приблизний час приготування.</p>
                  <textarea
                    id="edit-dish-recipe"
                    rows={7}
                    value={editRecipe}
                    onChange={(event) => setEditRecipe(event.target.value)}
                  />

                  <label htmlFor="edit-dish-cooking-time">час приготування (хв)</label>
                  <input
                    id="edit-dish-cooking-time"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={editCookingTime}
                    onChange={(event) => setEditCookingTime(event.target.value)}
                    placeholder="автоматично від AI або введіть вручну"
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

                  <div className="admin-form-actions">
                    <button type="button" className="dish-modal-secondary" onClick={goToEditStepOne}>
                      назад
                    </button>
                    <button type="submit" disabled={isSavingEdit}>
                      {isSavingEdit ? 'зберігаю...' : 'зберегти зміни'}
                    </button>
                  </div>
                </>
              )}

              {editError ? <p className="state-message state-message--error">{editError}</p> : null}
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
            <div className="dish-modal-header">
              <h2>Видалити страву?</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={closeModals}
              >
                ×
              </button>
            </div>
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
            <div className="dish-modal-header">
              <h2>додати до меню</h2>
              <button type="button" className="dish-modal-close" aria-label="Закрити" onClick={closeScheduleMenuModal}>
                ×
              </button>
            </div>
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
      {favoriteToastMessage ? <p className="state-message favorite-toast">{favoriteToastMessage}</p> : null}
    </main>
  )
}
