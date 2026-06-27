import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

const linkClass = ({ isActive }) =>
  isActive ? 'menu-link menu-link--active' : 'menu-link'

const profileLinkClass = ({ isActive }) =>
  isActive
    ? 'menu-link menu-link--active menu-link--profile'
    : 'menu-link menu-link--profile'

function MenuGroup({ title, categories }) {
  return (
    <div className="menu-group">
      <p className="menu-group-title">{title}</p>
      <div className="menu-scroll">
        {categories.map((category) => (
          <NavLink
            key={category.id}
            to={`/category/${category.id}`}
            className={linkClass}
          >
            {category.name}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function toDateKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(dateKey) {
  const todayKey = toDateKey(new Date())
  const date = new Date(`${dateKey}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateKey
  }

  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)

  if (dateKey === todayKey) {
    return `сьогодні, ${formatted}`
  }

  return formatted
}

export default function TopMenu({
  mealCategories,
  typeCategories,
  currentUser,
  isAdmin,
  hasProjectAccess,
  canViewProjectTab,
  showCategoryControls,
  onLogout,
  onOpenAddCategory,
  onOpenAddDish,
  onLoadActivityLogs,
  onLoadUnreadActivityCount,
}) {
  const location = useLocation()
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [activityLogs, setActivityLogs] = useState([])
  const [isActivityLoading, setIsActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [expandedDays, setExpandedDays] = useState({})
  const [unreadCount, setUnreadCount] = useState(0)

  const activityLogGroups = useMemo(() => {
    const groupsByDate = new Map()

    activityLogs.forEach((log) => {
      const dateKey = toDateKey(log.createdAt)
      const normalizedDateKey = dateKey || 'unknown-date'
      const existing = groupsByDate.get(normalizedDateKey) || []
      existing.push(log)
      groupsByDate.set(normalizedDateKey, existing)
    })

    const toSortableTime = (dateKey) => {
      if (dateKey === 'unknown-date') {
        return Number.NEGATIVE_INFINITY
      }

      const date = new Date(`${dateKey}T00:00:00`)
      return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime()
    }

    return Array.from(groupsByDate.entries())
      .sort((a, b) => toSortableTime(b[0]) - toSortableTime(a[0]))
      .map(([dateKey, logs]) => ({ dateKey, logs }))
  }, [activityLogs])

  useEffect(() => {
    if (!isActivityOpen && !isLogoutConfirmOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsActivityOpen(false)
        setIsLogoutConfirmOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isActivityOpen, isLogoutConfirmOpen])

  useEffect(() => {
    if (!currentUser || !onLoadUnreadActivityCount) {
      setUnreadCount(0)
      return
    }

    let isActive = true

    const loadUnreadCount = async () => {
      try {
        const data = await onLoadUnreadActivityCount()
        if (isActive) {
          setUnreadCount(Number(data?.count || 0))
        }
      } catch (_error) {
        if (isActive) {
          setUnreadCount(0)
        }
      }
    }

    loadUnreadCount()

    return () => {
      isActive = false
    }
  }, [currentUser, onLoadUnreadActivityCount])

  const openActivity = async () => {
    if (!onLoadActivityLogs) {
      return
    }

    setIsActivityOpen(true)
    setActivityError('')
    setIsActivityLoading(true)

    try {
      const logs = await onLoadActivityLogs(120, { markAsRead: true })
      const normalizedLogs = Array.isArray(logs) ? logs : []
      setActivityLogs(normalizedLogs)
      setUnreadCount(0)

      const todayKey = toDateKey(new Date())
      const nextExpandedDays = {}

      normalizedLogs.forEach((log) => {
        const dateKey = toDateKey(log.createdAt) || 'unknown-date'
        if (nextExpandedDays[dateKey] === undefined) {
          nextExpandedDays[dateKey] = dateKey === todayKey
        }
      })

      setExpandedDays(nextExpandedDays)
    } catch (error) {
      setActivityError(error.message)
    } finally {
      setIsActivityLoading(false)
    }
  }

  const toggleDay = (dateKey) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }))
  }

  const isDishesPageActive =
    location.pathname.startsWith('/category/')
  const isDashboardActive = location.pathname === '/'

  return (
    <>
      <header className="top-menu top-menu--strip">
        <div className="menu-actions menu-actions--strip">
          {currentUser ? (
            <>
              {hasProjectAccess ? (
                <>
                  <div className="menu-strip-center">
                    <NavLink
                      to="/"
                      className={isDashboardActive ? 'menu-link menu-link--active' : 'menu-link'}
                    >
                      Дашборд
                    </NavLink>
                    <NavLink
                      to="/category/all"
                      className={isDishesPageActive ? 'menu-link menu-link--active' : 'menu-link'}
                    >
                      Страви
                    </NavLink>
                    <NavLink to="/menu" className={linkClass}>
                      Меню
                    </NavLink>
                    <NavLink to="/shopping-list" className={linkClass}>
                      Покупки
                    </NavLink>
                    <NavLink to="/saved-recipes" className={linkClass}>
                      Рецепти
                    </NavLink>
                    <NavLink to="/favorites" className={linkClass}>
                      Улюблені
                    </NavLink>
                    {canViewProjectTab ? (
                      <NavLink to="/project" className={linkClass}>
                        Дошка
                      </NavLink>
                    ) : null}
                    <button
                      type="button"
                      className="menu-link menu-link--button"
                      onClick={() => setIsLogoutConfirmOpen(true)}
                    >
                      вийти
                    </button>
                  </div>

                  <button
                    type="button"
                    className="menu-link menu-link--icon"
                    aria-label="Відкрити останні дії"
                    title="останні дії"
                    onClick={() => {
                      void openActivity()
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5L3 18v1h18v-1l-2-2zm-2 .17.59.58H6.41l.59-.58V11a5 5 0 0 1 10 0v5.17z" />
                    </svg>
                    {unreadCount > 0 ? (
                      <span className="menu-link-notification-dot" aria-label={`Непрочитаних логів: ${unreadCount}`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </button>
                </>
              ) : (
                <div className="menu-strip-center menu-strip-center--locked">
                  <NavLink to="/no-project" className={linkClass}>
                    Головна
                  </NavLink>
                  <button
                    type="button"
                    className="menu-link menu-link--button"
                    onClick={() => setIsLogoutConfirmOpen(true)}
                  >
                    вийти
                  </button>
                </div>
              )}

              <NavLink to="/profile" className={profileLinkClass}>
                <img
                  src={currentUser.avatarUrl || '/avatar-placeholder.svg'}
                  alt="Профіль"
                  className="menu-avatar"
                />
              </NavLink>
            </>
          ) : (
            <div className="menu-strip-center">
              <NavLink to="/login" className={linkClass}>
                Увійти
              </NavLink>
              <NavLink to="/register" className={linkClass}>
                Реєстрація
              </NavLink>
            </div>
          )}
        </div>
      </header>

      {showCategoryControls ? (
        <section className="top-menu top-menu--categories">
          <div className="menu-actions menu-actions--categories">
            <NavLink to="/category/all" className={linkClass}>
              усі страви
            </NavLink>
          </div>

          {isAdmin ? (
            <div className="menu-actions menu-actions--categories">
              <button type="button" className="menu-link menu-link--button" onClick={onOpenAddCategory}>
                + додати категорію
              </button>
              <button type="button" className="menu-link menu-link--button" onClick={onOpenAddDish}>
                + додати страву
              </button>
            </div>
          ) : null}

          <MenuGroup title="За часом дня" categories={mealCategories} />
          <MenuGroup title="За видом страв" categories={typeCategories} />
        </section>
      ) : null}

      {isActivityOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setIsActivityOpen(false)}>
          <section
            className="dish-modal activity-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Останні дії"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>останні дії</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setIsActivityOpen(false)}
              >
                ×
              </button>
            </div>

            {isActivityLoading ? <p className="state-message">завантаження логів...</p> : null}
            {activityError ? <p className="state-message state-message--error">{activityError}</p> : null}

            {!isActivityLoading && !activityError && activityLogs.length === 0 ? (
              <p className="state-message">Ще немає записів активності.</p>
            ) : null}

            {!isActivityLoading && activityLogGroups.length > 0 ? (
              <ul className="activity-day-list" aria-label="Список логів активності">
                {activityLogGroups.map((group) => {
                  const isExpanded = Boolean(expandedDays[group.dateKey])

                  return (
                    <li key={group.dateKey} className="activity-day-item">
                      <button
                        type="button"
                        className="activity-day-toggle"
                        onClick={() => toggleDay(group.dateKey)}
                        aria-expanded={isExpanded}
                      >
                        <span>{formatDayLabel(group.dateKey)}</span>
                        <span className="activity-day-toggle-meta">
                          {group.logs.length}
                          {isExpanded ? ' ▲' : ' ▼'}
                        </span>
                      </button>

                      {isExpanded ? (
                        <ul className="activity-log-list" aria-label={`Логи за ${group.dateKey}`}>
                          {group.logs.map((log) => (
                            <li key={log.id} className="activity-log-item">
                              <p>{log.message}</p>
                              <div className="activity-log-item-meta">
                                <time dateTime={log.createdAt}>
                                  {new Intl.DateTimeFormat('uk-UA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }).format(new Date(log.createdAt))}
                                </time>
                                <span
                                  className={log.isRead ? 'activity-log-status activity-log-status--read' : 'activity-log-status activity-log-status--unread'}
                                >
                                  {log.isRead ? 'прочитано' : 'непрочитано'}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}

      {isLogoutConfirmOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setIsLogoutConfirmOpen(false)}>
          <section
            className="dish-modal dish-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Підтвердження виходу"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>вийти з акаунту?</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="dish-modal-warning">Потрібно підтвердження, щоб завершити поточну сесію.</p>

            <div className="dish-modal-actions dish-modal-actions--confirm">
              <button type="button" className="dish-modal-secondary" onClick={() => setIsLogoutConfirmOpen(false)}>
                скасувати
              </button>
              <button
                type="button"
                className="dish-modal-danger"
                onClick={() => {
                  setIsLogoutConfirmOpen(false)
                  onLogout()
                }}
              >
                вийти
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
