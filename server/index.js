import cors from 'cors'
import express from 'express'
import {
  createCategory,
  createDish,
  getCategories,
  getCategoryById,
  getDishes,
  initializeDatabase,
} from './db.js'

initializeDatabase()

const app = express()
const PORT = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/menu', (_req, res) => {
  const categories = getCategories()
  const mealCategories = categories.filter((item) => item.kind === 'MEAL')
  const typeCategories = categories.filter((item) => item.kind === 'TYPE')

  res.json({
    mealCategories,
    typeCategories,
    dishes: getDishes(),
  })
})

app.get('/api/categories', (req, res) => {
  const kind = req.query.kind

  if (kind && kind !== 'MEAL' && kind !== 'TYPE') {
    return res.status(400).json({ message: 'kind має бути MEAL або TYPE' })
  }

  return res.json(getCategories(kind))
})

app.post('/api/categories', (req, res) => {
  const name = String(req.body.name || '').trim()
  const kind = String(req.body.kind || '').trim().toUpperCase()

  if (!name) {
    return res.status(400).json({ message: 'Назва категорії обовʼязкова' })
  }

  if (kind !== 'MEAL' && kind !== 'TYPE') {
    return res.status(400).json({ message: 'kind має бути MEAL або TYPE' })
  }

  try {
    const category = createCategory({ name, kind })
    return res.status(201).json(category)
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Така категорія вже існує' })
    }

    return res.status(500).json({ message: 'Не вдалося створити категорію' })
  }
})

app.get('/api/dishes', (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null

  if (req.query.categoryId && Number.isNaN(categoryId)) {
    return res.status(400).json({ message: 'categoryId має бути числом' })
  }

  return res.json(getDishes(categoryId))
})

app.post('/api/dishes', (req, res) => {
  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const mealCategoryId = Number(req.body.mealCategoryId)
  const typeCategoryId = Number(req.body.typeCategoryId)

  if (!title) {
    return res.status(400).json({ message: 'Назва страви обовʼязкова' })
  }

  if (Number.isNaN(mealCategoryId) || Number.isNaN(typeCategoryId)) {
    return res.status(400).json({ message: 'Категорії страви мають бути числами' })
  }

  const mealCategory = getCategoryById(mealCategoryId)
  const typeCategory = getCategoryById(typeCategoryId)

  if (!mealCategory || mealCategory.kind !== 'MEAL') {
    return res.status(400).json({ message: 'Некоректна категорія за часом дня' })
  }

  if (!typeCategory || typeCategory.kind !== 'TYPE') {
    return res.status(400).json({ message: 'Некоректна категорія за видом страви' })
  }

  try {
    const dish = createDish({
      title,
      description,
      mealCategoryId,
      typeCategoryId,
    })

    return res.status(201).json(dish)
  } catch (_error) {
    return res.status(500).json({ message: 'Не вдалося створити страву' })
  }
})

app.listen(PORT, () => {
  console.log(`API запущено на http://localhost:${PORT}`)
})
