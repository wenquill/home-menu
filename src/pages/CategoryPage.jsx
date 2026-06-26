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

  const isEmptyCategory = filteredDishes.length === 0

  return (
    <main className={isEmptyCategory ? 'category-page category-page--empty' : 'category-page'}>
      {isEmptyCategory ? (
        <section className="empty-category-state" aria-label={`Страви: ${category?.name || 'Меню'}`}>
          <h2>{category?.name || 'Меню'}</h2>
          <p>Тут поки порожньо. Додайте перші страви у цю категорію.</p>
        </section>
      ) : (
        <>
          <h1>{category?.name || 'Меню'}</h1>
          <section className="dish-grid" aria-label={`Страви: ${category?.name || 'Меню'}`}>
            {filteredDishes.map((dish) => (
              <DishCard
                key={`${selectedCategoryId}-${dish.id}`}
                title={dish.title}
                description={dish.description}
              />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
