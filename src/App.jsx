import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import TopMenu from './components/TopMenu'
import AddCategoryPage from './pages/AddCategoryPage'
import AddDishPage from './pages/AddDishPage'
import AuthPage from './pages/AuthPage'
import CategoryPage from './pages/CategoryPage'
import CurrentProjectPage from './pages/CurrentProjectPage'
import DashboardPage from './pages/DashboardPage'
import EditDishPage from './pages/EditDishPage'
import MenuPage from './pages/MenuPage'
import NoProjectAccessPage from './pages/NoProjectAccessPage'
import ProfilePage from './pages/ProfilePage'
import SavedRecipesPage from './pages/SavedRecipesPage'
import ShoppingListPage from './pages/ShoppingListPage'

const emptyMenu = {
  mealCategories: [],
  typeCategories: [],
  dishes: [],
}

async function apiRequest(path, options = {}, token = '') {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = 'Помилка запиту до сервера'

    try {
      const errorData = await response.json()
      if (errorData?.message) {
        message = errorData.message
      }
    } catch (_error) {
      // Keep default message when JSON response is missing.
    }

    throw new Error(message)
  }

  // Some endpoints (for example DELETE) may return no body.
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return response.json()
}

function App() {
  const location = useLocation()
  const [themeId, setThemeId] = useState('sunny')
  const [menuData, setMenuData] = useState(emptyMenu)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [favoriteDishIds, setFavoriteDishIds] = useState([])
  const [userProjects, setUserProjects] = useState([])
  const [projectsReady, setProjectsReady] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false)
  const isAuthenticated = Boolean(currentUser)

  const isAdmin = currentUser?.role === 'ADMIN'
  const showCategoryControls = location.pathname.startsWith('/category/')

  const defaultCategoryId =
    menuData.mealCategories[0]?.id ?? menuData.typeCategories[0]?.id ?? null
  const hasProjectAccess = isAdmin || userProjects.length > 0
  const activeProjectMembership = currentUser?.currentProjectId
    ? userProjects.find((project) => Number(project.id) === Number(currentUser.currentProjectId))
    : userProjects[0]
  const canManageProjectMenu =
    isAdmin ||
    activeProjectMembership?.role === 'OWNER' ||
    activeProjectMembership?.permissionsRole === 'EDITOR'
  const canViewProjectTab = hasProjectAccess

  useEffect(() => {
    const userId = Number(currentUser?.id)

    if (!Number.isInteger(userId) || userId < 1) {
      setThemeId('sunny')
      return
    }

    const userThemeKey = `themeId:user:${userId}`
    const storedTheme = localStorage.getItem(userThemeKey)
    setThemeId(storedTheme || 'sunny')
  }, [currentUser?.id])

  useEffect(() => {
    const nextTheme = String(themeId || 'sunny')
    document.documentElement.setAttribute('data-theme', nextTheme)

    const userId = Number(currentUser?.id)
    if (!Number.isInteger(userId) || userId < 1) {
      return
    }

    localStorage.setItem(`themeId:user:${userId}`, nextTheme)
  }, [themeId, currentUser?.id])

  const loadMenuData = async ({ background = false } = {}) => {
    if (!background) {
      setIsLoading(true)
    }

    setPageError('')

    try {
      const data = await apiRequest('/api/menu', {}, authToken)
      setMenuData(data)
    } catch (error) {
      setPageError(error.message)
    } finally {
      if (!background) {
        setIsLoading(false)
      }
    }
  }

  const loadFavoriteDishIds = async () => {
    try {
      const data = await apiRequest('/api/favorites', {}, authToken)
      const ids = Array.isArray(data?.dishIds)
        ? data.dishIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : []
      setFavoriteDishIds(ids)
    } catch (error) {
      setPageError(error.message)
    }
  }

  const loadProjects = async () => {
    const data = await apiRequest('/api/projects', {}, authToken)
    const projects = Array.isArray(data?.projects) ? data.projects : []
    setUserProjects(projects)

    return projects
  }

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null)
      setAuthReady(true)
      return
    }

    const loadCurrentUser = async () => {
      try {
        const user = await apiRequest('/api/auth/me', {}, authToken)
        setCurrentUser(user)
      } catch (_error) {
        localStorage.removeItem('authToken')
        setAuthToken('')
        setCurrentUser(null)
      } finally {
        setAuthReady(true)
      }
    }

    setAuthReady(false)
    loadCurrentUser()
  }, [authToken])

  useEffect(() => {
    if (!authReady) {
      return
    }

    if (!isAuthenticated) {
      setMenuData(emptyMenu)
      setFavoriteDishIds([])
      setUserProjects([])
      setPageError('')
      setIsLoading(false)
      setProjectsReady(false)
      return
    }

    const loadInitialData = async () => {
      setIsLoading(true)
      setProjectsReady(false)
      setPageError('')

      try {
        const projects = await loadProjects()

        if (!isAdmin && projects.length === 0) {
          setMenuData(emptyMenu)
          setFavoriteDishIds([])
          return
        }

        const [menu, favorites] = await Promise.all([
          apiRequest('/api/menu', {}, authToken),
          apiRequest('/api/favorites', {}, authToken),
        ])

        setMenuData(menu)
        const ids = Array.isArray(favorites?.dishIds)
          ? favorites.dishIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
          : []
        setFavoriteDishIds(ids)
      } catch (error) {
        setPageError(error.message)
      } finally {
        setIsLoading(false)
        setProjectsReady(true)
      }
    }

    loadInitialData()
  }, [authReady, isAuthenticated, authToken])

  const handleAuthSubmit = async ({ email, password, displayName, mode }) => {
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const payload = mode === 'register'
      ? { email, password, displayName }
      : { email, password }

    const data = await apiRequest(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken,
    )

    localStorage.setItem('authToken', data.token)
    setAuthToken(data.token)
    setCurrentUser(data.user)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setAuthToken('')
    setCurrentUser(null)
    setIsAddCategoryModalOpen(false)
    setIsAddDishModalOpen(false)
  }

  useEffect(() => {
    if (!isAddCategoryModalOpen && !isAddDishModalOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAddCategoryModalOpen(false)
        setIsAddDishModalOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isAddCategoryModalOpen, isAddDishModalOpen])

  const handleUpdateProfile = async (payload) => {
    const updatedUser = await apiRequest(
      '/api/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      authToken,
    )

    setCurrentUser(updatedUser)
    return updatedUser
  }

  const handleAddCategory = async (payload) => {
    if (!canManageProjectMenu) {
      throw new Error('Недостатньо прав для додавання категорій')
    }

    const created = await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, authToken)

    await loadMenuData({ background: true })
    return created
  }

  const handleAddDish = async (payload) => {
    if (!canManageProjectMenu) {
      throw new Error('Недостатньо прав для додавання страв')
    }

    const created = await apiRequest('/api/dishes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, authToken)

    await loadMenuData({ background: true })
    return created
  }

  const handleUpdateDish = async ({ id, ...payload }) => {
    if (!canManageProjectMenu) {
      throw new Error('Недостатньо прав для редагування страв')
    }

    const updated = await apiRequest(
      `/api/dishes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      authToken,
    )

    await loadMenuData({ background: true })
    return updated
  }

  const handleDeleteDish = async (id) => {
    if (!canManageProjectMenu) {
      throw new Error('Недостатньо прав для видалення страв')
    }

    await apiRequest(
      `/api/dishes/${id}`,
      {
        method: 'DELETE',
      },
      authToken,
    )

    await loadMenuData({ background: true })
  }

  const handleGetDishById = async (id) => {
    return apiRequest(`/api/dishes/${id}`, {}, authToken)
  }

  const handleGetMenuEntriesByDate = async (menuDate) => {
    return apiRequest(`/api/menu-plan?date=${encodeURIComponent(menuDate)}`, {}, authToken)
  }

  const handleGetMenuSpecialEntriesByDate = async (menuDate) => {
    return apiRequest(`/api/menu-special?date=${encodeURIComponent(menuDate)}`, {}, authToken)
  }

  const handleScheduleDishToMenu = async ({ dishId, menuDate, components }) => {
    if (!isAuthenticated) {
      throw new Error('Потрібна авторизація')
    }

    return apiRequest(
      '/api/menu-plan',
      {
        method: 'POST',
        body: JSON.stringify({ dishId, menuDate, components }),
      },
      authToken,
    )
  }

  const handleRemoveDishFromMenu = async (menuEntryId) => {
    return apiRequest(
      `/api/menu-plan/${menuEntryId}`,
      {
        method: 'DELETE',
      },
      authToken,
    )
  }

  const handleAddSpecialMenuEntry = async ({ menuDate, sourceType, title, notes }) => {
    return apiRequest(
      '/api/menu-special',
      {
        method: 'POST',
        body: JSON.stringify({ menuDate, sourceType, title, notes }),
      },
      authToken,
    )
  }

  const handleRemoveSpecialMenuEntry = async (id) => {
    return apiRequest(
      `/api/menu-special/${id}`,
      {
        method: 'DELETE',
      },
      authToken,
    )
  }

  const handleLoadActivityLogs = async (limit = 80, { markAsRead = true } = {}) => {
    return apiRequest(
      `/api/activity-logs?limit=${encodeURIComponent(limit)}&markAsRead=${markAsRead ? 'true' : 'false'}`,
      {},
      authToken,
    )
  }

  const handleLoadUnreadActivityCount = async () => {
    return apiRequest('/api/activity-logs/unread-count', {}, authToken)
  }

  const handleLoadShoppingList = async () => {
    return apiRequest('/api/shopping-list', {}, authToken)
  }

  const handleAddShoppingListItem = async (text) => {
    return apiRequest(
      '/api/shopping-list',
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      },
      authToken,
    )
  }

  const handleUpdateShoppingListItem = async (itemId, checked) => {
    return apiRequest(
      `/api/shopping-list/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ checked }),
      },
      authToken,
    )
  }

  const handleClearShoppingList = async () => {
    return apiRequest(
      '/api/shopping-list',
      {
        method: 'DELETE',
      },
      authToken,
    )
  }

  const handleLoadSavedRecipes = async () => {
    const data = await apiRequest('/api/saved-recipes', {}, authToken)
    return Array.isArray(data?.recipes) ? data.recipes : []
  }

  const handleLoadDashboardStats = async () => {
    return apiRequest('/api/dashboard/stats', {}, authToken)
  }

  const handleCreateSavedRecipe = async (payload) => {
    return apiRequest(
      '/api/saved-recipes',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      authToken,
    )
  }

  const handleUpdateSavedRecipe = async ({ id, ...payload }) => {
    return apiRequest(
      `/api/saved-recipes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      authToken,
    )
  }

  const handleDeleteSavedRecipe = async (id) => {
    return apiRequest(
      `/api/saved-recipes/${id}`,
      {
        method: 'DELETE',
      },
      authToken,
    )
  }

  const handleToggleSavedRecipeTried = async (id, isTried) => {
    return apiRequest(
      `/api/saved-recipes/${id}/tried`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isTried }),
      },
      authToken,
    )
  }

  const refreshProjectScopedData = async () => {
    const [menu, favorites, projects] = await Promise.all([
      apiRequest('/api/menu', {}, authToken),
      apiRequest('/api/favorites', {}, authToken),
      apiRequest('/api/projects', {}, authToken),
    ])

    setMenuData(menu)
    setFavoriteDishIds(Array.isArray(favorites?.dishIds) ? favorites.dishIds : [])
    setUserProjects(Array.isArray(projects?.projects) ? projects.projects : [])
  }

  const handleCreateProject = async (input) => {
    const boardPayload = typeof input === 'string'
      ? { name: input }
      : input

    const response = await apiRequest(
      '/api/projects',
      {
        method: 'POST',
        body: JSON.stringify(boardPayload),
      },
      authToken,
    )

    if (response?.user) {
      setCurrentUser(response.user)
    }

    await refreshProjectScopedData()
    return response.project
  }

  const handleUpdateCurrentProjectInfo = async ({ name, notes }) => {
    const updated = await apiRequest(
      '/api/projects/current/info',
      {
        method: 'PUT',
        body: JSON.stringify({ name, notes }),
      },
      authToken,
    )

    await refreshProjectScopedData()
    return updated
  }

  const handleDeleteProject = async (projectId) => {
    await apiRequest(
      `/api/projects/${projectId}`,
      {
        method: 'DELETE',
      },
      authToken,
    )

    await refreshProjectScopedData()
  }

  const handleSwitchCurrentProject = async (projectId) => {
    const user = await apiRequest(
      '/api/projects/current',
      {
        method: 'PUT',
        body: JSON.stringify({ projectId }),
      },
      authToken,
    )

    setCurrentUser(user)
    await refreshProjectScopedData()
    return user
  }

  const handleLoadCurrentProject = async () => {
    return apiRequest('/api/projects/current', {}, authToken)
  }

  const handleInviteToCurrentProject = async (email) => {
    return apiRequest(
      '/api/projects/current/invite',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      authToken,
    )
  }

  const handleLoadCurrentProjectMembers = async () => {
    return apiRequest('/api/projects/current/members', {}, authToken)
  }

  const handleRemoveMemberFromCurrentProject = async (userId) => {
    return apiRequest(
      `/api/projects/current/members/${userId}`,
      {
        method: 'DELETE',
      },
      authToken,
    )
  }

  const handleUpdateMemberRoleInCurrentProject = async (userId, permissionsRole) => {
    return apiRequest(
      `/api/projects/current/members/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ permissionsRole }),
      },
      authToken,
    )
  }

  const handleToggleFavoriteDish = async (dishId, isCurrentlyFavorite) => {
    if (!isAuthenticated) {
      throw new Error('Потрібна авторизація')
    }

    const normalizedDishId = Number(dishId)
    if (Number.isNaN(normalizedDishId)) {
      throw new Error('Некоректний id страви')
    }

    if (isCurrentlyFavorite) {
      await apiRequest(`/api/favorites/${normalizedDishId}`, { method: 'DELETE' }, authToken)
      setFavoriteDishIds((prev) => prev.filter((id) => id !== normalizedDishId))
      return { added: false }
    }

    await apiRequest(`/api/favorites/${normalizedDishId}`, { method: 'POST' }, authToken)
    setFavoriteDishIds((prev) => (prev.includes(normalizedDishId) ? prev : [normalizedDishId, ...prev]))
    return { added: true }
  }

  const openAddCategoryModal = () => {
    if (!canManageProjectMenu) {
      return
    }

    setIsAddDishModalOpen(false)
    setIsAddCategoryModalOpen(true)
  }

  const openAddDishModal = () => {
    if (!canManageProjectMenu) {
      return
    }

    setIsAddCategoryModalOpen(false)
    setIsAddDishModalOpen(true)
  }

  const closeAddModals = () => {
    setIsAddCategoryModalOpen(false)
    setIsAddDishModalOpen(false)
  }

  const emptyStateElement = (
    <main className="category-page">
      <h1>Категорії ще не створені</h1>
      <p className="state-message">Додайте перші категорії на сторінці додавання.</p>
    </main>
  )

  const protectedContent = (element) => {
    if (!authReady) {
      return <main className="category-page"><p className="state-message">Перевірка доступу...</p></main>
    }

    if (isAuthenticated && !projectsReady) {
      return <main className="category-page"><p className="state-message">Завантаження проєкту...</p></main>
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (hasProjectAccess && location.pathname === '/no-project') {
      return <Navigate to="/" replace />
    }

    if (
      !hasProjectAccess &&
      location.pathname !== '/profile' &&
      location.pathname !== '/no-project'
    ) {
      return <Navigate to="/no-project" replace />
    }

    return element
  }

  return (
    <div className="app-shell">
      {isAuthenticated ? (
        <TopMenu
          mealCategories={menuData.mealCategories}
          typeCategories={menuData.typeCategories}
          currentUser={currentUser}
          isAdmin={canManageProjectMenu}
          hasProjectAccess={hasProjectAccess}
          canViewProjectTab={canViewProjectTab}
          showCategoryControls={showCategoryControls}
          onLogout={handleLogout}
          onOpenAddCategory={openAddCategoryModal}
          onOpenAddDish={openAddDishModal}
          onLoadActivityLogs={handleLoadActivityLogs}
          onLoadUnreadActivityCount={handleLoadUnreadActivityCount}
        />
      ) : null}

      {isAuthenticated && (isLoading || !authReady) ? <p className="state-message">Завантаження меню...</p> : null}
      {isAuthenticated && !isLoading && pageError ? <p className="state-message state-message--error">{pageError}</p> : null}

      <Routes>
        <Route
          path="/"
          element={protectedContent(
            <DashboardPage
              dishes={menuData.dishes}
              onLoadTodayMenuEntries={handleGetMenuEntriesByDate}
              onLoadShoppingList={handleLoadShoppingList}
              onLoadSavedRecipes={handleLoadSavedRecipes}
              onLoadDashboardStats={handleLoadDashboardStats}
              onScheduleDishToMenu={handleScheduleDishToMenu}
              canManageProjectMenu={canManageProjectMenu}
            />
          )}
        />
        <Route
          path="/category/:categoryId"
          element={protectedContent(
            <CategoryPage
              mealCategories={menuData.mealCategories}
              typeCategories={menuData.typeCategories}
              dishes={menuData.dishes}
              defaultCategoryId={defaultCategoryId}
              isAdmin={canManageProjectMenu}
              favoriteDishIds={favoriteDishIds}
              onToggleFavoriteDish={handleToggleFavoriteDish}
              onUpdateDish={handleUpdateDish}
              onDeleteDish={handleDeleteDish}
              onGetDishById={handleGetDishById}
              onScheduleDishToMenu={handleScheduleDishToMenu}
            />
          )}
        />
        <Route
          path="/favorites"
          element={protectedContent(
            <CategoryPage
              viewMode="favorites"
              mealCategories={menuData.mealCategories}
              typeCategories={menuData.typeCategories}
              dishes={menuData.dishes}
              defaultCategoryId={defaultCategoryId}
              isAdmin={canManageProjectMenu}
              favoriteDishIds={favoriteDishIds}
              onToggleFavoriteDish={handleToggleFavoriteDish}
              onUpdateDish={handleUpdateDish}
              onDeleteDish={handleDeleteDish}
              onGetDishById={handleGetDishById}
              onScheduleDishToMenu={handleScheduleDishToMenu}
            />
          )}
        />
        <Route
          path="/menu"
          element={protectedContent(
            <MenuPage
              onLoadMenuEntries={handleGetMenuEntriesByDate}
              onRemoveMenuEntry={handleRemoveDishFromMenu}
              onLoadSpecialMenuEntries={handleGetMenuSpecialEntriesByDate}
              onCreateSpecialMenuEntry={handleAddSpecialMenuEntry}
              onDeleteSpecialMenuEntry={handleRemoveSpecialMenuEntry}
            />
          )}
        />
        <Route
          path="/saved-recipes"
          element={protectedContent(
            <SavedRecipesPage
              onLoadSavedRecipes={handleLoadSavedRecipes}
              onCreateSavedRecipe={handleCreateSavedRecipe}
              onUpdateSavedRecipe={handleUpdateSavedRecipe}
              onDeleteSavedRecipe={handleDeleteSavedRecipe}
              onToggleSavedRecipeTried={handleToggleSavedRecipeTried}
            />,
          )}
        />
        <Route
          path="/shopping-list"
          element={protectedContent(
            <ShoppingListPage
              onLoadShoppingList={handleLoadShoppingList}
              onAddShoppingListItem={handleAddShoppingListItem}
              onUpdateShoppingListItem={handleUpdateShoppingListItem}
              onClearShoppingList={handleClearShoppingList}
            />
          )}
        />
        <Route
          path="/add-category"
          element={protectedContent(
            canManageProjectMenu ? (
              <AddCategoryPage onAddCategory={handleAddCategory} />
            ) : (
              <Navigate to="/login" replace />
            )
          )}
        />
        <Route
          path="/add-dish"
          element={protectedContent(
            canManageProjectMenu ? (
              <AddDishPage
                mealCategories={menuData.mealCategories}
                typeCategories={menuData.typeCategories}
                onAddDish={handleAddDish}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          )}
        />
        <Route
          path="/edit-dish/:dishId"
          element={protectedContent(
            canManageProjectMenu ? (
              <EditDishPage
                dishes={menuData.dishes}
                mealCategories={menuData.mealCategories}
                typeCategories={menuData.typeCategories}
                isAdmin={canManageProjectMenu}
                onUpdateDish={handleUpdateDish}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          )}
        />
        <Route
          path="/profile"
          element={protectedContent(
            <ProfilePage
              currentUser={currentUser}
              projects={userProjects}
              onUpdateProfile={handleUpdateProfile}
              onCreateProject={handleCreateProject}
              onSwitchProject={handleSwitchCurrentProject}
              selectedThemeId={themeId}
              onThemeChange={setThemeId}
            />,
          )}
        />
        <Route
          path="/project"
          element={protectedContent(
            canViewProjectTab ? (
              <CurrentProjectPage
                currentUser={currentUser}
                projects={userProjects}
                onCreateProject={handleCreateProject}
                onSwitchProject={handleSwitchCurrentProject}
                onLoadCurrentProject={handleLoadCurrentProject}
                onUpdateCurrentProjectInfo={handleUpdateCurrentProjectInfo}
                onInviteToCurrentProject={handleInviteToCurrentProject}
                onLoadCurrentProjectMembers={handleLoadCurrentProjectMembers}
                onRemoveMemberFromCurrentProject={handleRemoveMemberFromCurrentProject}
                onUpdateMemberRoleInCurrentProject={handleUpdateMemberRoleInCurrentProject}
                onDeleteProject={handleDeleteProject}
              />
            ) : (
              <Navigate to="/" replace />
            ),
          )}
        />
        <Route
          path="/no-project"
          element={protectedContent(<NoProjectAccessPage onCreateBoard={handleCreateProject} />)}
        />
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to={hasProjectAccess ? '/' : '/no-project'} replace />
              : <AuthPage mode="login" onSubmitAuth={handleAuthSubmit} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated
              ? <Navigate to={hasProjectAccess ? '/' : '/no-project'} replace />
              : <AuthPage mode="register" onSubmitAuth={handleAuthSubmit} />
          }
        />
        <Route
          path="*"
          element={protectedContent(
            defaultCategoryId
              ? <Navigate to={`/category/${defaultCategoryId}`} replace />
              : emptyStateElement
          )}
        />
      </Routes>

      {isAuthenticated && canManageProjectMenu && isAddCategoryModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeAddModals}>
          <section
            className="dish-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Додати категорію"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dish-modal-close"
              aria-label="Закрити"
              onClick={closeAddModals}
            >
              ×
            </button>
            <AddCategoryPage
              onAddCategory={handleAddCategory}
              embedded
              onClose={closeAddModals}
              onSuccess={closeAddModals}
            />
          </section>
        </div>
      ) : null}

      {isAuthenticated && canManageProjectMenu && isAddDishModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={closeAddModals}>
          <section
            className="dish-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Додати страву"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dish-modal-close"
              aria-label="Закрити"
              onClick={closeAddModals}
            >
              ×
            </button>
            <AddDishPage
              mealCategories={menuData.mealCategories}
              typeCategories={menuData.typeCategories}
              onAddDish={handleAddDish}
              embedded
              onClose={closeAddModals}
              onSuccess={closeAddModals}
            />
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
