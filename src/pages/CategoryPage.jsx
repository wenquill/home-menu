import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

function DishCard({ title, description }) {
  return (
    <article className="dish-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function AdminPanel({ mealCategories, typeCategories, onAddCategory, onAddDish }) {
  const navigate = useNavigate()
  const [categoryName, setCategoryName] = useState('')
  const [categoryKind, setCategoryKind] = useState('MEAL')
  const [dishTitle, setDishTitle] = useState('')
  const [dishDescription, setDishDescription] = useState('')
  const [mealCategoryId, setMealCategoryId] = useState('')
  const [typeCategoryId, setTypeCategoryId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)
  const [isSubmittingDish, setIsSubmittingDish] = useState(false)

  useEffect(() => {
    if (!mealCategoryId && mealCategories.length > 0) {
      setMealCategoryId(String(mealCategories[0].id))
    }

    if (!typeCategoryId && typeCategories.length > 0) {
      setTypeCategoryId(String(typeCategories[0].id))
    }
  }, [mealCategoryId, typeCategoryId, mealCategories, typeCategories])

  const submitCategory = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')
    setIsSubmittingCategory(true)

    try {
      const created = await onAddCategory({ name: categoryName, kind: categoryKind })
      setCategoryName('')
      setFormMessage('Категорію успішно додано')
      navigate(`/category/${created.id}`)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  const submitDish = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')
    setIsSubmittingDish(true)

    try {
      await onAddDish({
        title: dishTitle,
        description: dishDescription,
        mealCategoryId: Number(mealCategoryId),
        typeCategoryId: Number(typeCategoryId),
      })

      setDishTitle('')
      setDishDescription('')
      setFormMessage('Страву успішно додано')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmittingDish(false)
    }
  }

  return (
    <section className="admin-panel" aria-label="Керування меню">
      <h2>Додати нові дані</h2>

      <form className="admin-form" onSubmit={submitCategory}>
        <h3>Нова категорія</h3>
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          placeholder="Назва категорії"
          required
        />
        <select
          value={categoryKind}
          onChange={(event) => setCategoryKind(event.target.value)}
        >
          <option value="MEAL">За часом дня</option>
          <option value="TYPE">За видом страв</option>
        </select>
        <button type="submit" disabled={isSubmittingCategory}>
          {isSubmittingCategory ? 'Зберігаю...' : 'Додати категорію'}
        </button>
      </form>

      <form className="admin-form" onSubmit={submitDish}>
        <h3>Нова страва</h3>
        <input
          value={dishTitle}
          onChange={(event) => setDishTitle(event.target.value)}
          placeholder="Назва страви"
          required
        />
        <textarea
          value={dishDescription}
          onChange={(event) => setDishDescription(event.target.value)}
          placeholder="Короткий опис"
          rows={3}
        />
        <select
          value={mealCategoryId}
          onChange={(event) => setMealCategoryId(event.target.value)}
          required
        >
          {mealCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={typeCategoryId}
          onChange={(event) => setTypeCategoryId(event.target.value)}
          required
        >
          {typeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmittingDish || mealCategories.length === 0 || typeCategories.length === 0}
        >
          {isSubmittingDish ? 'Зберігаю...' : 'Додати страву'}
        </button>
      </form>

      {formError ? <p className="state-message state-message--error">{formError}</p> : null}
      {formMessage ? <p className="state-message">{formMessage}</p> : null}
    </section>
  )
}

export default function CategoryPage({
  mealCategories,
  typeCategories,
  dishes,
  defaultCategoryId,
  onAddCategory,
  onAddDish,
}) {
  const { categoryId } = useParams()
  const selectedCategoryId = Number(categoryId)

  const allCategories = useMemo(
    () => [...mealCategories, ...typeCategories],
    [mealCategories, typeCategories],
  )

  const category = allCategories.find((item) => item.id === selectedCategoryId)

  if (!category && defaultCategoryId) {
    return <Navigate to={`/category/${defaultCategoryId}`} replace />
  }

  const filteredDishes = category
    ? dishes.filter(
        (dish) =>
          dish.mealCategoryId === selectedCategoryId ||
          dish.typeCategoryId === selectedCategoryId,
      )
    : []

  return (
    <main className="category-page">
      <h1>{category?.name || 'Меню'}</h1>

      <section className="dish-grid" aria-label={`Страви: ${category?.name || 'Меню'}`}>
        {filteredDishes.length > 0 ? (
          filteredDishes.map((dish) => (
            <DishCard
              key={`${selectedCategoryId}-${dish.id}`}
              title={dish.title}
              description={dish.description}
            />
          ))
        ) : (
          <article className="dish-card dish-card--empty">
            <h3>Тут поки порожньо</h3>
            <p>Додайте перші страви у цю категорію.</p>
          </article>
        )}
      </section>

      <AdminPanel
        mealCategories={mealCategories}
        typeCategories={typeCategories}
        onAddCategory={onAddCategory}
        onAddDish={onAddDish}
      />
    </main>
  )
}
