import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import TopMenu from './components/TopMenu'
import AddCategoryPage from './pages/AddCategoryPage'
import AddDishPage from './pages/AddDishPage'
import AuthPage from './pages/AuthPage'
import CategoryPage from './pages/CategoryPage'
import EditDishPage from './pages/EditDishPage'
import ProfilePage from './pages/ProfilePage'

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

  return response.json()
}

function App() {
  const [menuData, setMenuData] = useState(emptyMenu)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const isAuthenticated = Boolean(currentUser)

  const isAdmin = currentUser?.role === 'ADMIN'

  const defaultCategoryId =
    menuData.mealCategories[0]?.id ?? menuData.typeCategories[0]?.id ?? null

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
      setPageError('')
      setIsLoading(false)
      return
    }

    loadMenuData()
  }, [authReady, isAuthenticated, authToken])

  const handleAuthSubmit = async ({ email, password, mode }) => {
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const data = await apiRequest(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
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
  }

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
    if (!isAdmin) {
      throw new Error('Доступ лише для адміністратора')
    }

    const created = await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, authToken)

    await loadMenuData({ background: true })
    return created
  }

  const handleAddDish = async (payload) => {
    if (!isAdmin) {
      throw new Error('Доступ лише для адміністратора')
    }

    const created = await apiRequest('/api/dishes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, authToken)

    await loadMenuData({ background: true })
    return created
  }

  const handleUpdateDish = async ({ id, ...payload }) => {
    if (!isAdmin) {
      throw new Error('Доступ лише для адміністратора')
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

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
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
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />
      ) : null}

      {isAuthenticated && (isLoading || !authReady) ? <p className="state-message">Завантаження меню...</p> : null}
      {isAuthenticated && !isLoading && pageError ? <p className="state-message state-message--error">{pageError}</p> : null}

      <Routes>
        <Route
          path="/"
          element={protectedContent(
            defaultCategoryId ? (
              <Navigate to={`/category/${defaultCategoryId}`} replace />
            ) : (
              emptyStateElement
            )
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
              isAdmin={isAdmin}
            />
          )}
        />
        <Route
          path="/add-category"
          element={protectedContent(
            isAdmin ? (
              <AddCategoryPage onAddCategory={handleAddCategory} />
            ) : (
              <Navigate to="/login" replace />
            )
          )}
        />
        <Route
          path="/add-dish"
          element={protectedContent(
            isAdmin ? (
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
            isAdmin ? (
              <EditDishPage
                dishes={menuData.dishes}
                mealCategories={menuData.mealCategories}
                typeCategories={menuData.typeCategories}
                isAdmin={isAdmin}
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
            <ProfilePage currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />,
          )}
        />
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
              : <AuthPage mode="login" onSubmitAuth={handleAuthSubmit} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
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
    </div>
  )
}

export default App
