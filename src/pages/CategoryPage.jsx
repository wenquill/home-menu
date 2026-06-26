import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'

function DishCard({ title, description }) {
  return (
    <article className="dish-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

export default function CategoryPage({
  mealCategories,
  typeCategories,
  dishes,
  defaultCategoryId,
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
    </main>
  )
}
