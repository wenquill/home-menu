import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrentMonthLabel() {
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function DashboardActionIcon({ kind }) {
  if (kind === 'dish') {
    return <span className="dashboard-action-emoji" aria-hidden="true">🍽️</span>
  }

  if (kind === 'shopping') {
    return <span className="dashboard-action-emoji" aria-hidden="true">🛒</span>
  }

  if (kind === 'menu') {
    return <span className="dashboard-action-emoji" aria-hidden="true">📅</span>
  }

  return <span className="dashboard-action-emoji" aria-hidden="true">💛</span>
}

function DashboardStatIcon({ kind }) {
  if (kind === 'dishes') {
    return <span className="dashboard-stat-emoji" aria-hidden="true">🍲</span>
  }

  if (kind === 'recipes') {
    return <span className="dashboard-stat-emoji" aria-hidden="true">📖</span>
  }

  return <span className="dashboard-stat-emoji" aria-hidden="true">✅</span>
}

export default function DashboardPage({
  dishes = [],
  onLoadTodayMenuEntries,
  onLoadShoppingList,
  onLoadDashboardStats,
  onScheduleDishToMenu,
  canManageProjectMenu,
}) {
  const navigate = useNavigate()
  const [todayMenuEntries, setTodayMenuEntries] = useState([])
  const [shoppingItems, setShoppingItems] = useState([])
  const [stats, setStats] = useState({
    newDishesCount: 0,
    newSavedRecipesCount: 0,
    completedPurchasesCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeSuggestionId, setActiveSuggestionId] = useState(null)

  const todayDate = getTodayDateString()
  const monthLabel = formatCurrentMonthLabel()

  const loadDashboardData = async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const [menuEntries, shoppingData, statsData] = await Promise.all([
        onLoadTodayMenuEntries?.(todayDate),
        onLoadShoppingList?.(),
        onLoadDashboardStats?.(),
      ])

      setTodayMenuEntries(Array.isArray(menuEntries) ? menuEntries : [])
      setShoppingItems(Array.isArray(shoppingData?.items) ? shoppingData.items : [])
      setStats({
        newDishesCount: Number(statsData?.newDishesCount || 0),
        newSavedRecipesCount: Number(statsData?.newSavedRecipesCount || 0),
        completedPurchasesCount: Number(statsData?.completedPurchasesCount || 0),
      })
    } catch (error) {
      setPageError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
  }, [onLoadTodayMenuEntries, onLoadShoppingList, onLoadDashboardStats])

  const pendingShoppingItems = useMemo(
    () => shoppingItems.filter((item) => !item.isChecked),
    [shoppingItems],
  )

  const todayDishIdSet = useMemo(
    () => new Set((todayMenuEntries || []).map((entry) => Number(entry.id)).filter((id) => Number.isInteger(id))),
    [todayMenuEntries],
  )

  const suggestedDishes = useMemo(() => {
    const available = (dishes || []).filter((dish) => !todayDishIdSet.has(Number(dish.id)))
    const shuffled = [...available].sort((a, b) => ((a.id * 17) % 13) - ((b.id * 17) % 13))
    return shuffled.slice(0, 3)
  }, [dishes, todayDishIdSet])

  const addSuggestionToMenu = async (dish) => {
    if (!dish || !onScheduleDishToMenu) {
      return
    }

    setActionError('')
    setActionMessage('')
    setActiveSuggestionId(dish.id)

    try {
      await onScheduleDishToMenu({
        dishId: dish.id,
        menuDate: todayDate,
        components: dish.components || [],
      })
      setActionMessage(`страву "${dish.title}" додано до меню на сьогодні`)
      await loadDashboardData()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActiveSuggestionId(null)
    }
  }

  return (
    <main className="category-page dashboard-page">
      <h1 className="category-title">дашборд</h1>

      {pageError ? <p className="state-message state-message--error">{pageError}</p> : null}
      {actionError ? <p className="state-message state-message--error">{actionError}</p> : null}
      {actionMessage ? <p className="state-message">{actionMessage}</p> : null}
      {isLoading ? <p className="state-message">завантаження дашборда...</p> : null}

      {!isLoading ? (
        <section className="dashboard-grid">
          <article className="admin-panel dashboard-card">
            <div className="dashboard-card-header">
              <h2>заплановано на сьогодні</h2>
            </div>
            {todayMenuEntries.length > 0 ? (
              <ul className="dashboard-list">
                {todayMenuEntries.slice(0, 4).map((entry) => (
                  <li key={`${entry.menuEntryId}-${entry.id}`}>
                    <strong>{entry.title}</strong>
                    <span>{entry.mealCategoryName} / {entry.typeCategoryName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-empty-block">
                <p>На сьогодні ще нічого не заплановано.</p>
                <button type="button" className="dashboard-link-button" onClick={() => navigate('/category/all')}>
                  запланувати
                </button>
              </div>
            )}
          </article>

          <article className="admin-panel dashboard-card">
            <div className="dashboard-card-header">
              <h2>потрібно купити</h2>
            </div>
            {pendingShoppingItems.length > 0 ? (
              <ul className="dashboard-list">
                {pendingShoppingItems.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <strong>{item.text}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-empty-block">
                <p>Список покупок зараз порожній.</p>
                <button type="button" className="dashboard-link-button" onClick={() => navigate('/shopping-list')}>
                  запланувати покупки
                </button>
              </div>
            )}
          </article>

          <article className="admin-panel dashboard-card dashboard-card--wide">
            <div className="dashboard-card-header">
              <h2>пропозиції</h2>
            </div>
            {suggestedDishes.length > 0 ? (
              <div className="dashboard-suggestions">
                {suggestedDishes.map((dish) => (
                  <article key={dish.id} className="dashboard-suggestion-card">
                    <div>
                      <h3>{dish.title}</h3>
                      <p>{dish.description || 'Опис поки не додано'}</p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-link-button"
                      onClick={() => {
                        void addSuggestionToMenu(dish)
                      }}
                      disabled={activeSuggestionId === dish.id}
                    >
                      {activeSuggestionId === dish.id ? 'додаю...' : 'додати до меню'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-muted">Усі доступні страви вже додані на сьогодні або ще не створені.</p>
            )}
          </article>

          <article className="admin-panel dashboard-card">
            <div className="dashboard-card-header">
              <h2>статистика</h2>
              <span>{monthLabel}</span>
            </div>
            <div className="dashboard-stats">
              <div className="dashboard-stat-item">
                <strong>{stats.newDishesCount}</strong>
                <span>нових страв</span>
              </div>
              <div className="dashboard-stat-item">
                <strong>{stats.newSavedRecipesCount}</strong>
                <span>нових рецептів</span>
              </div>
              <div className="dashboard-stat-item">
                <strong>{stats.completedPurchasesCount}</strong>
                <span>виконано покупок</span>
              </div>
            </div>
          </article>

          <article className="admin-panel dashboard-card">
            <div className="dashboard-card-header">
              <h2>швидкі дії</h2>
            </div>
            <div className="dashboard-actions-grid">
              <button
                type="button"
                className="dashboard-action-button"
                onClick={() => navigate('/category/all')}
              >
                <DashboardActionIcon kind="dish" />
                <span>додати нову страву</span>
              </button>
              <button type="button" className="dashboard-action-button" onClick={() => navigate('/shopping-list')}>
                <DashboardActionIcon kind="shopping" />
                <span>відкрити покупки</span>
              </button>
              <button type="button" className="dashboard-action-button" onClick={() => navigate('/menu')}>
                <DashboardActionIcon kind="menu" />
                <span>запланувати меню</span>
              </button>
              <button type="button" className="dashboard-action-button" onClick={() => navigate('/favorites')}>
                <DashboardActionIcon kind="favorite" />
                <span>відкрити улюблені</span>
              </button>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  )
}
