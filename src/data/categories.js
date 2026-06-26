export const mealCategories = [
  { id: 'breakfasts', label: 'Сніданки' },
  { id: 'lunches', label: 'Обіди' },
  { id: 'dinners', label: 'Вечері' },
  { id: 'snacks', label: 'Перекуси' },
  { id: 'other', label: 'Інше' },
]

export const dishTypeCategories = [
  { id: 'starters', label: 'Закуски' },
  { id: 'salads', label: 'Салати' },
  { id: 'sides', label: 'Гарнір' },
  { id: 'main-courses', label: 'Основне' },
  { id: 'desserts', label: 'Десерти' },
]

export const allCategories = [...mealCategories, ...dishTypeCategories]

export const categoryMap = Object.fromEntries(
  allCategories.map((category) => [category.id, category]),
)
