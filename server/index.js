import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import {
  createUser,
  createCategory,
  createDish,
  getDishById,
  getCategories,
  getCategoryById,
  getDishes,
  getUserByEmail,
  getUserById,
  initializeDatabase,
  updateUserById,
  updateDish,
} from './db.js'

initializeDatabase()

const app = express()
const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = String(process.env.JWT_SECRET || 'dev-secret-change-me')
const TOKEN_TTL = '7d'

app.use(cors())
app.use(express.json())

function signUserToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Потрібна авторизація' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = getUserById(Number(payload.sub))

    if (!user) {
      return res.status(401).json({ message: 'Користувача не знайдено' })
    }

    req.user = user
    return next()
  } catch (_error) {
    return res.status(401).json({ message: 'Недійсний токен' })
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Доступ лише для адміністратора' })
  }

  return next()
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Вкажіть коректний email' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Пароль має бути мінімум 6 символів' })
  }

  const existingUser = getUserByEmail(email)
  if (existingUser) {
    return res.status(409).json({ message: 'Користувач з таким email вже існує' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = createUser({ email, passwordHash, role: 'USER' })
  const token = signUserToken(user)

  return res.status(201).json({ token, user })
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  const user = getUserByEmail(email)
  if (!user) {
    return res.status(401).json({ message: 'Невірний email або пароль' })
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Невірний email або пароль' })
  }

  const authUser = { id: user.id, email: user.email, role: user.role }
  const token = signUserToken(authUser)

  return res.json({ token, user: authUser })
})

app.get('/api/auth/me', authRequired, (req, res) => {
  return res.json(req.user)
})

app.put('/api/profile', authRequired, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const currentPassword = String(req.body.currentPassword || '')
  const newPassword = String(req.body.newPassword || '')
  const avatarDataUrl = String(req.body.avatarDataUrl || '').trim()

  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Вкажіть коректний логін (email)' })
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ message: 'Новий пароль має бути мінімум 6 символів' })
  }

  const userWithPassword = getUserByEmail(req.user.email)

  if (!userWithPassword) {
    return res.status(404).json({ message: 'Користувача не знайдено' })
  }

  const isEmailChanged = email !== userWithPassword.email
  const isPasswordChanged = Boolean(newPassword)

  if ((isEmailChanged || isPasswordChanged) && !currentPassword) {
    return res.status(400).json({ message: 'Введіть поточний пароль для змін логіна або пароля' })
  }

  if (currentPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.passwordHash)

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Поточний пароль невірний' })
    }
  }

  const existingUser = getUserByEmail(email)
  if (existingUser && existingUser.id !== userWithPassword.id) {
    return res.status(409).json({ message: 'Користувач з таким логіном вже існує' })
  }

  if (avatarDataUrl && !avatarDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ message: 'Аватар має бути зображенням' })
  }

  if (avatarDataUrl.length > 2_000_000) {
    return res.status(400).json({ message: 'Аватар занадто великий. Спробуйте менше зображення' })
  }

  const nextPasswordHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : userWithPassword.passwordHash

  const updatedUser = updateUserById({
    id: userWithPassword.id,
    email,
    passwordHash: nextPasswordHash,
    avatarUrl: avatarDataUrl,
  })

  return res.json(updatedUser)
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

app.post('/api/categories', authRequired, adminRequired, (req, res) => {
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

app.post('/api/dishes', authRequired, adminRequired, (req, res) => {
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

app.put('/api/dishes/:id', authRequired, adminRequired, (req, res) => {
  const dishId = Number(req.params.id)
  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const mealCategoryId = Number(req.body.mealCategoryId)
  const typeCategoryId = Number(req.body.typeCategoryId)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  if (!title) {
    return res.status(400).json({ message: 'Назва страви обовʼязкова' })
  }

  if (Number.isNaN(mealCategoryId) || Number.isNaN(typeCategoryId)) {
    return res.status(400).json({ message: 'Категорії страви мають бути числами' })
  }

  const existingDish = getDishById(dishId)
  if (!existingDish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
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
    const dish = updateDish({
      id: dishId,
      title,
      description,
      mealCategoryId,
      typeCategoryId,
    })

    return res.json(dish)
  } catch (_error) {
    return res.status(500).json({ message: 'Не вдалося оновити страву' })
  }
})

app.listen(PORT, () => {
  console.log(`API запущено на http://localhost:${PORT}`)
})
