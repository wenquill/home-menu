import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import {
  addFavoriteDishForUser,
  createUser,
  createActivityLog,
  createCategory,
  createDish,
  createMenuEntry,
  deleteDish,
  deleteMenuEntryById,
  getDishById,
  getMenuEntryById,
  getCategories,
  getCategoryById,
  getMenuEntriesByDate,
  getRecentActivityLogsForUser,
  getUnreadActivityLogsCountForUser,
  markActivityLogsAsReadForUser,
  getDishes,
  getFavoriteDishIdsForUser,
  getUserByEmail,
  getUserById,
  initializeDatabase,
  removeFavoriteDishForUser,
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

function addActivityLogSafe(payload) {
  try {
    createActivityLog(payload)
  } catch (_error) {
    // Activity logs must not break the main user operation.
  }
}

function getAddedComponents(beforeComponents = [], afterComponents = []) {
  const beforeSet = new Set(beforeComponents.map((item) => String(item).trim().toLowerCase()).filter(Boolean))
  return afterComponents
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item) => !beforeSet.has(item.toLowerCase()))
}

function getRemovedComponents(beforeComponents = [], afterComponents = []) {
  const afterSet = new Set(afterComponents.map((item) => String(item).trim().toLowerCase()).filter(Boolean))
  return beforeComponents
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item) => !afterSet.has(item.toLowerCase()))
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const displayName = String(req.body.displayName || '').trim()
  const password = String(req.body.password || '')

  if (!displayName) {
    return res.status(400).json({ message: 'Вкажіть імʼя користувача' })
  }

  if (displayName.length > 60) {
    return res.status(400).json({ message: 'Імʼя має бути не довшим за 60 символів' })
  }

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
  const user = createUser({ email, displayName, passwordHash, role: 'USER' })
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

  const authUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  }
  const token = signUserToken(authUser)

  return res.json({ token, user: authUser })
})

app.get('/api/auth/me', authRequired, (req, res) => {
  return res.json(req.user)
})

app.put('/api/profile', authRequired, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const displayName = String(req.body.displayName || '').trim()
  const currentPassword = String(req.body.currentPassword || '')
  const newPassword = String(req.body.newPassword || '')
  const avatarDataUrl = String(req.body.avatarDataUrl || '').trim()
  const isPresetAvatar = /^\/default-avatars\/avatar-([1-9]|10)\.svg$/.test(avatarDataUrl)
  const isUploadedImage = avatarDataUrl.startsWith('data:image/')

  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Вкажіть коректний логін (email)' })
  }

  if (!displayName) {
    return res.status(400).json({ message: 'Імʼя користувача обовʼязкове' })
  }

  if (displayName.length > 60) {
    return res.status(400).json({ message: 'Імʼя має бути не довшим за 60 символів' })
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

  if (avatarDataUrl && !isUploadedImage && !isPresetAvatar) {
    return res.status(400).json({ message: 'Аватар має бути зображенням або дефолтним аватаром' })
  }

  if (isUploadedImage && avatarDataUrl.length > 2_000_000) {
    return res.status(400).json({ message: 'Аватар занадто великий. Спробуйте менше зображення' })
  }

  const nextPasswordHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : userWithPassword.passwordHash

  const updatedUser = updateUserById({
    id: userWithPassword.id,
    email,
    displayName,
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

app.get('/api/activity-logs', authRequired, (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 60
  const markAsRead = req.query.markAsRead !== 'false'

  if (Number.isNaN(limit) || limit < 1 || limit > 300) {
    return res.status(400).json({ message: 'limit має бути числом від 1 до 300' })
  }

  const logs = getRecentActivityLogsForUser(req.user.id, limit)

  if (markAsRead && logs.length > 0) {
    markActivityLogsAsReadForUser(req.user.id, logs.map((log) => log.id))
    return res.json(logs.map((log) => ({ ...log, isRead: true })))
  }

  return res.json(logs)
})

app.get('/api/activity-logs/unread-count', authRequired, (req, res) => {
  return res.json({ count: getUnreadActivityLogsCountForUser(req.user.id) })
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
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'CATEGORY_CREATED',
      message: `${actorName} створив(ла) нову категорію \"${category.name}\"`,
      details: {
        categoryId: category.id,
        categoryName: category.name,
        categoryKind: category.kind,
      },
    })

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

app.get('/api/dishes/:id', (req, res) => {
  const dishId = Number(req.params.id)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const dish = getDishById(dishId)
  if (!dish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  return res.json(dish)
})

app.get('/api/favorites', authRequired, (req, res) => {
  const dishIds = getFavoriteDishIdsForUser(req.user.id)
  return res.json({ dishIds })
})

app.post('/api/favorites/:dishId', authRequired, (req, res) => {
  const dishId = Number(req.params.dishId)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const dish = getDishById(dishId)
  if (!dish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  addFavoriteDishForUser(req.user.id, dishId)
  return res.status(201).json({ success: true })
})

app.delete('/api/favorites/:dishId', authRequired, (req, res) => {
  const dishId = Number(req.params.dishId)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  removeFavoriteDishForUser(req.user.id, dishId)
  return res.json({ success: true })
})

app.post('/api/dishes', authRequired, adminRequired, (req, res) => {
  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const recipe = String(req.body.recipe || '').trim()
  const mealCategoryId = Number(req.body.mealCategoryId)
  const typeCategoryId = Number(req.body.typeCategoryId)
  const components = Array.isArray(req.body.components) ? req.body.components : []

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
      recipe,
      mealCategoryId,
      typeCategoryId,
      components,
    })
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'DISH_CREATED',
      message: `${actorName} створив(ла) нову страву \"${dish.title}\"`,
      details: {
        dishId: dish.id,
        dishTitle: dish.title,
      },
    })

    const createdComponents = (dish.components || []).map((item) => String(item).trim()).filter(Boolean)
    createdComponents.forEach((componentName) => {
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'DISH_COMPONENT_ADDED',
        message: `${actorName} додав(ла) компонент \"${componentName}\" до страви \"${dish.title}\"`,
        details: {
          dishId: dish.id,
          dishTitle: dish.title,
          componentName,
        },
      })
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
  const recipe = String(req.body.recipe || '').trim()
  const mealCategoryId = Number(req.body.mealCategoryId)
  const typeCategoryId = Number(req.body.typeCategoryId)
  const components = Array.isArray(req.body.components) ? req.body.components : []

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
      recipe,
      mealCategoryId,
      typeCategoryId,
      components,
    })
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'DISH_UPDATED',
      message: `${actorName} редагував(ла) страву \"${dish.title}\"`,
      details: {
        dishId: dish.id,
        dishTitle: dish.title,
      },
    })

    const addedComponents = getAddedComponents(existingDish.components || [], dish.components || [])
    const removedComponents = getRemovedComponents(existingDish.components || [], dish.components || [])

    addedComponents.forEach((componentName) => {
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'DISH_COMPONENT_ADDED',
        message: `${actorName} додав(ла) компонент \"${componentName}\" до страви \"${dish.title}\"`,
        details: {
          dishId: dish.id,
          dishTitle: dish.title,
          componentName,
        },
      })
    })

    removedComponents.forEach((componentName) => {
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'DISH_COMPONENT_REMOVED',
        message: `${actorName} видалив(ла) компонент \"${componentName}\" зі страви \"${dish.title}\"`,
        details: {
          dishId: dish.id,
          dishTitle: dish.title,
          componentName,
        },
      })
    })

    return res.json(dish)
  } catch (_error) {
    return res.status(500).json({ message: 'Не вдалося оновити страву' })
  }
})

app.delete('/api/dishes/:id', authRequired, adminRequired, (req, res) => {
  const dishId = Number(req.params.id)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const existingDish = getDishById(dishId)
  if (!existingDish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  try {
    deleteDish(dishId)
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'DISH_DELETED',
      message: `${actorName} видалив(ла) страву \"${existingDish.title}\"`,
      details: {
        dishId,
        dishTitle: existingDish.title,
      },
    })

    return res.json({ success: true })
  } catch (_error) {
    return res.status(500).json({ message: 'Не вдалося видалити страву' })
  }
})

app.get('/api/menu-plan', authRequired, (req, res) => {
  const menuDate = String(req.query.date || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate)) {
    return res.status(400).json({ message: 'date має бути у форматі YYYY-MM-DD' })
  }

  try {
    return res.json(getMenuEntriesByDate(menuDate))
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.post('/api/menu-plan', authRequired, (req, res) => {
  const dishId = Number(req.body.dishId)
  const menuDate = String(req.body.menuDate || '').trim()
  const components = Array.isArray(req.body.components) ? req.body.components : undefined

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'dishId має бути числом' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate)) {
    return res.status(400).json({ message: 'menuDate має бути у форматі YYYY-MM-DD' })
  }

  try {
    const menuEntry = createMenuEntry({ dishId, menuDate, components })
    const actorName = req.user.displayName || req.user.email

    const dish = getDishById(dishId)
    if (dish) {
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'MENU_ENTRY_ADDED',
        message: `${actorName} додав(ла) до меню на ${menuDate} страву \"${dish.title}\"`,
        details: {
          menuEntryId: menuEntry.id,
          menuDate,
          dishId: dish.id,
          dishTitle: dish.title,
        },
      })
    }

    return res.status(201).json(menuEntry)
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Цю страву вже додано до меню на цю дату' })
    }

    return res.status(400).json({ message: error.message })
  }
})

app.delete('/api/menu-plan/:id', authRequired, (req, res) => {
  const menuEntryId = Number(req.params.id)

  if (Number.isNaN(menuEntryId)) {
    return res.status(400).json({ message: 'Некоректний id елемента меню' })
  }

  try {
    const menuEntry = getMenuEntryById(menuEntryId)
    const deleted = deleteMenuEntryById(menuEntryId)

    if (!deleted) {
      return res.status(404).json({ message: 'Елемент меню не знайдено' })
    }

    if (menuEntry) {
      const actorName = req.user.displayName || req.user.email
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'MENU_ENTRY_REMOVED',
        message: `${actorName} прибрав(ла) з меню на ${menuEntry.menuDate} страву \"${menuEntry.title}\"`,
        details: {
          menuEntryId,
          menuDate: menuEntry.menuDate,
          dishId: menuEntry.id,
          dishTitle: menuEntry.title,
        },
      })
    }

    return res.json({ success: true })
  } catch (_error) {
    return res.status(500).json({ message: 'Не вдалося прибрати страву з меню' })
  }
})

app.listen(PORT, () => {
  console.log(`API запущено на http://localhost:${PORT}`)
})
