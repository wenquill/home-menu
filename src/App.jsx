import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import TopMenu from './components/TopMenu'
import AddCategoryPage from './pages/AddCategoryPage'
import AddDishPage from './pages/AddDishPage'
import CategoryPage from './pages/CategoryPage'

const emptyMenu = {
  mealCategories: [],
  typeCategories: [],
  dishes: [],
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
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

  const defaultCategoryId =
    menuData.mealCategories[0]?.id ?? menuData.typeCategories[0]?.id ?? null

  const loadMenuData = async ({ background = false } = {}) => {
    if (!background) {
      setIsLoading(true)
    }

    setPageError('')

    try {
      const data = await apiRequest('/api/menu')
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
    loadMenuData()
  }, [])

  const handleAddCategory = async (payload) => {
    const created = await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    await loadMenuData({ background: true })
    return created
  }

  const handleAddDish = async (payload) => {
    const created = await apiRequest('/api/dishes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    await loadMenuData({ background: true })
    return created
  }

  const emptyStateElement = (
    <main className="category-page">
      <h1>Категорії ще не створені</h1>
      <p className="state-message">Додайте перші категорії на сторінці додавання.</p>
    </main>
  )

  return (
    <div className="app-shell">
      <TopMenu
        mealCategories={menuData.mealCategories}
        typeCategories={menuData.typeCategories}
      />

      {isLoading ? <p className="state-message">Завантаження меню...</p> : null}
      {!isLoading && pageError ? <p className="state-message state-message--error">{pageError}</p> : null}

      <Routes>
        <Route
          path="/"
          element={
            defaultCategoryId ? (
              <Navigate to={`/category/${defaultCategoryId}`} replace />
            ) : (
              emptyStateElement
            )
          }
        />
        <Route
          path="/category/:categoryId"
          element={
            <CategoryPage
              mealCategories={menuData.mealCategories}
              typeCategories={menuData.typeCategories}
              dishes={menuData.dishes}
              defaultCategoryId={defaultCategoryId}
            />
          }
        />
        <Route
          path="/add-category"
          element={<AddCategoryPage onAddCategory={handleAddCategory} />}
        />
        <Route
          path="/add-dish"
          element={
            <AddDishPage
              mealCategories={menuData.mealCategories}
              typeCategories={menuData.typeCategories}
              onAddDish={handleAddDish}
            />
          }
        />
        <Route
          path="*"
          element={
            defaultCategoryId ? (
              <Navigate to={`/category/${defaultCategoryId}`} replace />
            ) : (
              emptyStateElement
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App
