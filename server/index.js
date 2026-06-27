import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import {
  addFavoriteDishForUser,
  addFavoriteDishForUserInProject,
  addShoppingItemInProject,
  addShoppingItemsInProject,
  createSavedRecipeByUser,
    deleteSavedRecipeByUser,
  addProjectMembership,
  clearShoppingListInProject,
  countProjectMembers,
  createUser,
  createActivityLog,
  createCategory,
  createCategoryInProject,
  createDish,
  createDishInProject,
  createMenuEntry,
  createMenuEntryInProject,
  createProject,
  deleteProjectById,
  deleteDish,
  deleteMenuEntryById,
  getDishById,
  getDishByIdInProject,
  getMenuEntryById,
  getCategories,
  getCategoriesByProject,
  getDashboardStatsForMonth,
  getCategoryById,
  getCategoryByIdInProject,
  getMenuEntriesByDate,
  getMenuEntriesByDateInProject,
  getProjectById,
  getProjectPermissionsRoleForUser,
  getProjectRoleForUser,
  getProjectsForUser,
  getShoppingListItemsByProject,
  getSavedRecipesByUser,
  setSavedRecipeTriedByUser,
  updateSavedRecipeByUser,
  getProjectMembers,
  getRecentActivityLogsForUserInProject,
  getUnreadActivityLogsCountForUserInProject,
  markActivityLogsAsReadForUser,
  getDishes,
  getDishesByProject,
  getFavoriteDishIdsForUser,
  getFavoriteDishIdsForUserInProject,
  isUserInProject,
  getUserByEmail,
  getUserById,
  initializeDatabase,
  removeFavoriteDishForUser,
  removeFavoriteDishForUserInProject,
  removeProjectMembership,
  setCurrentProjectForUser,
  updateProjectById,
  updateProjectMemberPermissionsRole,
  updateShoppingItemCheckedInProject,
  updateUserById,
  updateDish,
  updateDishInProject,
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

function resolveCurrentProjectId(user) {
  const preferredProjectId = Number(user?.currentProjectId)
  if (
    Number.isInteger(preferredProjectId) &&
    preferredProjectId > 0 &&
    isUserInProject(user.id, preferredProjectId)
  ) {
    return preferredProjectId
  }

  const projects = getProjectsForUser(user.id)
  const fallbackProjectId = projects[0]?.id || null

  if (fallbackProjectId && fallbackProjectId !== preferredProjectId) {
    setCurrentProjectForUser(user.id, fallbackProjectId)
  }

  return fallbackProjectId
}

function projectAccessRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Потрібна авторизація' })
  }

  const projectId = resolveCurrentProjectId(req.user)

  if (!projectId) {
    return res.status(403).json({ message: 'У вас ще немає жодної дошки' })
  }

  if (!isUserInProject(req.user.id, projectId)) {
    return res.status(403).json({ message: 'Ви не маєте доступу до поточної дошки' })
  }

  req.projectId = projectId
  return next()
}

function projectOwnerOrAdminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Потрібна авторизація' })
  }

  if (req.user.role === 'ADMIN') {
    return next()
  }

  const role = getProjectRoleForUser(req.user.id, req.projectId)
  if (role !== 'OWNER') {
    return res.status(403).json({ message: 'Потрібні права власника дошки' })
  }

  return next()
}

function projectEditorOrOwnerOrAdminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Потрібна авторизація' })
  }

  if (req.user.role === 'ADMIN') {
    return next()
  }

  const role = getProjectRoleForUser(req.user.id, req.projectId)
  if (role === 'OWNER') {
    return next()
  }

  const permissionsRole = getProjectPermissionsRoleForUser(req.user.id, req.projectId)
  if (permissionsRole === 'EDITOR') {
    return next()
  }

  return res.status(403).json({ message: 'Недостатньо прав для керування стравами і категоріями' })
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
    currentProjectId: user.currentProjectId || null,
    avatarUrl: user.avatarUrl,
  }
  const token = signUserToken(authUser)

  return res.json({ token, user: authUser })
})

app.get('/api/auth/me', authRequired, (req, res) => {
  return res.json(req.user)
})

app.get('/api/projects', authRequired, (req, res) => {
  const projects = getProjectsForUser(req.user.id)
  return res.json({
    currentProjectId: req.user.currentProjectId || null,
    projects,
  })
})

app.post('/api/projects', authRequired, (req, res) => {
  const name = String(req.body.name || '').trim()
  const notes = String(req.body.notes || '').trim()
  const inviteEmails = Array.isArray(req.body.inviteEmails) ? req.body.inviteEmails : []

  if (!name) {
    return res.status(400).json({ message: 'Назва дошки обовʼязкова' })
  }

  if (name.length > 80) {
    return res.status(400).json({ message: 'Назва дошки має бути не довшою за 80 символів' })
  }

  if (notes.length > 600) {
    return res.status(400).json({ message: 'Нотатки до дошки мають бути не довшими за 600 символів' })
  }

  const project = createProject({
    name,
    notes,
    createdByUserId: req.user.id,
  })

  const invited = []
  const notFoundEmails = []

  inviteEmails
    .map((email) => String(email || '').trim().toLowerCase())
    .filter((email) => email && email.includes('@'))
    .forEach((email) => {
      const invitedUser = getUserByEmail(email)

      if (!invitedUser) {
        notFoundEmails.push(email)
        return
      }

      if (invitedUser.id === req.user.id) {
        return
      }

      const wasAdded = addProjectMembership({
        userId: invitedUser.id,
        projectId: project.id,
        role: 'MEMBER',
      })

      if (wasAdded) {
        invited.push(email)
      }
    })

  const freshUser = getUserById(req.user.id)

  return res.status(201).json({
    project,
    invited,
    notFoundEmails,
    user: freshUser,
  })
})

app.put('/api/projects/current', authRequired, (req, res) => {
  const projectId = Number(req.body.projectId)

  if (Number.isNaN(projectId)) {
    return res.status(400).json({ message: 'Некоректний projectId' })
  }

  if (!isUserInProject(req.user.id, projectId)) {
    return res.status(403).json({ message: 'Ви не маєте доступу до цієї дошки' })
  }

  const updatedUser = setCurrentProjectForUser(req.user.id, projectId)
  return res.json(updatedUser)
})

app.get('/api/projects/current', authRequired, projectAccessRequired, (req, res) => {
  const project = getProjectById(req.projectId)

  if (!project) {
    return res.status(404).json({ message: 'Поточну дошку не знайдено' })
  }

  return res.json({
    ...project,
    role: getProjectRoleForUser(req.user.id, req.projectId),
    permissionsRole: getProjectPermissionsRoleForUser(req.user.id, req.projectId),
    memberCount: countProjectMembers(req.projectId),
  })
})

app.put('/api/projects/current/info', authRequired, projectAccessRequired, projectOwnerOrAdminRequired, (req, res) => {
  const name = String(req.body.name || '').trim()
  const notes = String(req.body.notes || '').trim()

  if (!name) {
    return res.status(400).json({ message: 'Назва дошки обовʼязкова' })
  }

  if (name.length > 80) {
    return res.status(400).json({ message: 'Назва дошки має бути не довшою за 80 символів' })
  }

  if (notes.length > 600) {
    return res.status(400).json({ message: 'Нотатки до дошки мають бути не довшими за 600 символів' })
  }

  const updated = updateProjectById({
    projectId: req.projectId,
    name,
    notes,
  })

  if (!updated) {
    return res.status(404).json({ message: 'Дошку не знайдено' })
  }

  return res.json(updated)
})

app.delete('/api/projects/:projectId', authRequired, (req, res) => {
  const projectId = Number(req.params.projectId)

  if (!Number.isInteger(projectId) || projectId < 1) {
    return res.status(400).json({ message: 'Некоректний projectId' })
  }

  if (Number(req.user.currentProjectId) === projectId) {
    return res.status(400).json({ message: 'Поточну дошку видаляти не можна' })
  }

  if (!isUserInProject(req.user.id, projectId)) {
    return res.status(403).json({ message: 'Ви не маєте доступу до цієї дошки' })
  }

  const boardRole = getProjectRoleForUser(req.user.id, projectId)
  if (req.user.role !== 'ADMIN' && boardRole !== 'OWNER') {
    return res.status(403).json({ message: 'Видаляти дошку може лише її власник' })
  }

  const deleted = deleteProjectById(projectId)
  if (!deleted) {
    return res.status(404).json({ message: 'Дошку не знайдено' })
  }

  return res.status(204).send()
})

app.post('/api/projects/current/invite', authRequired, projectAccessRequired, projectOwnerOrAdminRequired, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Вкажіть коректний email користувача' })
  }

  const invitedUser = getUserByEmail(email)
  if (!invitedUser) {
    return res.status(404).json({ message: 'Користувача з таким email не знайдено' })
  }

  addProjectMembership({
    userId: invitedUser.id,
    projectId: req.projectId,
    role: 'MEMBER',
  })

  return res.json({ success: true })
})

app.get('/api/projects/current/members', authRequired, projectAccessRequired, projectOwnerOrAdminRequired, (req, res) => {
  const members = getProjectMembers(req.projectId)
  return res.json({ members })
})

app.delete('/api/projects/current/members/:userId', authRequired, projectAccessRequired, projectOwnerOrAdminRequired, (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: 'Некоректний userId' })
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Ви не можете видалити себе з поточної дошки' })
  }

  const result = removeProjectMembership(userId, req.projectId)

  if (!result?.removed && result?.reason === 'LAST_OWNER') {
    return res.status(400).json({ message: 'Не можна видалити останнього власника дошки' })
  }

  if (!result?.removed) {
    return res.status(404).json({ message: 'Учасника не знайдено в поточній дошці' })
  }

  return res.status(204).send()
})

app.put('/api/projects/current/members/:userId/role', authRequired, projectAccessRequired, projectOwnerOrAdminRequired, (req, res) => {
  const userId = Number(req.params.userId)
  const permissionsRole = String(req.body.permissionsRole || '').trim().toUpperCase()

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: 'Некоректний userId' })
  }

  if (permissionsRole !== 'MEMBER' && permissionsRole !== 'EDITOR') {
    return res.status(400).json({ message: 'permissionsRole має бути MEMBER або EDITOR' })
  }

  const updated = updateProjectMemberPermissionsRole({
    userId,
    projectId: req.projectId,
    permissionsRole,
  })

  if (!updated) {
    return res.status(404).json({ message: 'Учасника не знайдено в поточній дошці' })
  }

  return res.json(updated)
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

app.get('/api/menu', authRequired, projectAccessRequired, (req, res) => {
  const categories = getCategoriesByProject(req.projectId)
  const mealCategories = categories.filter((item) => item.kind === 'MEAL')
  const typeCategories = categories.filter((item) => item.kind === 'TYPE')

  res.json({
    mealCategories,
    typeCategories,
    dishes: getDishesByProject(req.projectId),
  })
})

app.get('/api/activity-logs', authRequired, projectAccessRequired, (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 60
  const markAsRead = req.query.markAsRead !== 'false'

  if (Number.isNaN(limit) || limit < 1 || limit > 300) {
    return res.status(400).json({ message: 'limit має бути числом від 1 до 300' })
  }

  const logs = getRecentActivityLogsForUserInProject(req.user.id, req.projectId, limit)

  if (markAsRead && logs.length > 0) {
    markActivityLogsAsReadForUser(req.user.id, logs.map((log) => log.id))
    return res.json(logs.map((log) => ({ ...log, isRead: true })))
  }

  return res.json(logs)
})

app.get('/api/activity-logs/unread-count', authRequired, projectAccessRequired, (req, res) => {
  return res.json({ count: getUnreadActivityLogsCountForUserInProject(req.user.id, req.projectId) })
})

app.get('/api/categories', authRequired, projectAccessRequired, (req, res) => {
  const kind = req.query.kind

  if (kind && kind !== 'MEAL' && kind !== 'TYPE') {
    return res.status(400).json({ message: 'kind має бути MEAL або TYPE' })
  }

  return res.json(getCategoriesByProject(req.projectId, kind))
})

app.post('/api/categories', authRequired, projectAccessRequired, projectEditorOrOwnerOrAdminRequired, (req, res) => {
  const name = String(req.body.name || '').trim()
  const kind = String(req.body.kind || '').trim().toUpperCase()

  if (!name) {
    return res.status(400).json({ message: 'Назва категорії обовʼязкова' })
  }

  if (kind !== 'MEAL' && kind !== 'TYPE') {
    return res.status(400).json({ message: 'kind має бути MEAL або TYPE' })
  }

  try {
    const category = createCategoryInProject({ name, kind, projectId: req.projectId })
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: req.projectId,
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

app.get('/api/dishes', authRequired, projectAccessRequired, (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null

  if (req.query.categoryId && Number.isNaN(categoryId)) {
    return res.status(400).json({ message: 'categoryId має бути числом' })
  }

  return res.json(getDishesByProject(req.projectId, categoryId))
})

app.get('/api/dishes/:id', authRequired, projectAccessRequired, (req, res) => {
  const dishId = Number(req.params.id)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const dish = getDishByIdInProject(dishId, req.projectId)
  if (!dish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  return res.json(dish)
})

app.get('/api/favorites', authRequired, projectAccessRequired, (req, res) => {
  const dishIds = getFavoriteDishIdsForUserInProject(req.user.id, req.projectId)
  return res.json({ dishIds })
})

app.get('/api/shopping-list', authRequired, projectAccessRequired, (req, res) => {
  const items = getShoppingListItemsByProject(req.projectId)
  return res.json({ items })
})

app.get('/api/dashboard/stats', authRequired, projectAccessRequired, (req, res) => {
  const monthPrefix = new Date().toISOString().slice(0, 7)
  const stats = getDashboardStatsForMonth({
    projectId: req.projectId,
    userId: req.user.id,
    monthPrefix,
  })

  return res.json(stats)
})

app.get('/api/saved-recipes', authRequired, (req, res) => {
  const recipes = getSavedRecipesByUser(req.user.id)
  return res.json({ recipes })
})

app.post('/api/saved-recipes', authRequired, (req, res) => {
  const title = String(req.body.title || '').trim()
  const link = String(req.body.link || '').trim()
  const notes = String(req.body.notes || '').trim()

  if (!title) {
    return res.status(400).json({ message: 'Назва рецепта обовʼязкова' })
  }

  if (link && !/^https?:\/\//i.test(link)) {
    return res.status(400).json({ message: 'Посилання має починатися з http:// або https://' })
  }

  try {
    const recipe = createSavedRecipeByUser({
      userId: req.user.id,
      title,
      link,
      notes,
    })

    const actorName = req.user.displayName || req.user.email
    const activityProjectId = resolveCurrentProjectId(req.user)

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: activityProjectId || undefined,
      action: 'SAVED_RECIPE_CREATED',
      message: `${actorName} зберіг(ла) новий рецепт "${recipe.title}"`,
      details: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        hasLink: Boolean(recipe.link),
      },
    })

    return res.status(201).json(recipe)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Не вдалося зберегти рецепт' })
  }
})

app.patch('/api/saved-recipes/:id/tried', authRequired, (req, res) => {
  const recipeId = Number(req.params.id)
  const isTried = Boolean(req.body.isTried)

  if (!Number.isInteger(recipeId) || recipeId < 1) {
    return res.status(400).json({ message: 'Некоректний id рецепта' })
  }

  const recipe = setSavedRecipeTriedByUser({
    id: recipeId,
    userId: req.user.id,
    isTried,
  })

  if (!recipe) {
    return res.status(404).json({ message: 'Рецепт не знайдено' })
  }

  const actorName = req.user.displayName || req.user.email
  const activityProjectId = resolveCurrentProjectId(req.user)

  if (activityProjectId) {
    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: activityProjectId,
      action: 'SAVED_RECIPE_TRY_STATUS_UPDATED',
      message: isTried
        ? `${actorName} позначив(ла) рецепт "${recipe.title}" як спробований`
        : `${actorName} зняв(ла) позначку спробованого з рецепта "${recipe.title}"`,
      details: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        isTried: Boolean(recipe.isTried),
      },
    })
  }

  return res.json(recipe)
})

app.put('/api/saved-recipes/:id', authRequired, (req, res) => {
  const recipeId = Number(req.params.id)
  const title = String(req.body.title || '').trim()
  const link = String(req.body.link || '').trim()
  const notes = String(req.body.notes || '').trim()

  if (!Number.isInteger(recipeId) || recipeId < 1) {
    return res.status(400).json({ message: 'Некоректний id рецепта' })
  }

  if (!title) {
    return res.status(400).json({ message: 'Назва рецепта обовʼязкова' })
  }

  if (link && !/^https?:\/\//i.test(link)) {
    return res.status(400).json({ message: 'Посилання має починатися з http:// або https://' })
  }

  try {
    const recipe = updateSavedRecipeByUser({
      id: recipeId,
      userId: req.user.id,
      title,
      link,
      notes,
    })

    if (!recipe) {
      return res.status(404).json({ message: 'Рецепт не знайдено' })
    }

    return res.json(recipe)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Не вдалося оновити рецепт' })
  }
})

app.delete('/api/saved-recipes/:id', authRequired, (req, res) => {
  const recipeId = Number(req.params.id)

  if (!Number.isInteger(recipeId) || recipeId < 1) {
    return res.status(400).json({ message: 'Некоректний id рецепта' })
  }

  const deleted = deleteSavedRecipeByUser({ id: recipeId, userId: req.user.id })

  if (!deleted) {
    return res.status(404).json({ message: 'Рецепт не знайдено' })
  }

  return res.status(204).send()
})

app.post('/api/shopping-list', authRequired, projectAccessRequired, (req, res) => {
  const text = String(req.body.text || '').trim()

  if (!text) {
    return res.status(400).json({ message: 'Назва елемента списку обовʼязкова' })
  }

  try {
    const item = addShoppingItemInProject({ projectId: req.projectId, text, checked: false })
    return res.status(201).json(item)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.put('/api/shopping-list/:id', authRequired, projectAccessRequired, (req, res) => {
  const itemId = Number(req.params.id)
  const checked = Boolean(req.body.checked)

  if (!Number.isInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Некоректний id елемента списку' })
  }

  const updated = updateShoppingItemCheckedInProject({
    id: itemId,
    projectId: req.projectId,
    checked,
  })

  if (!updated) {
    return res.status(404).json({ message: 'Елемент списку не знайдено' })
  }

  return res.json(updated)
})

app.delete('/api/shopping-list', authRequired, projectAccessRequired, (req, res) => {
  clearShoppingListInProject(req.projectId)
  return res.status(204).send()
})

app.post('/api/favorites/:dishId', authRequired, projectAccessRequired, (req, res) => {
  const dishId = Number(req.params.dishId)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const dish = getDishByIdInProject(dishId, req.projectId)
  if (!dish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  addFavoriteDishForUserInProject(req.user.id, dishId, req.projectId)
  return res.status(201).json({ success: true })
})

app.delete('/api/favorites/:dishId', authRequired, projectAccessRequired, (req, res) => {
  const dishId = Number(req.params.dishId)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  removeFavoriteDishForUserInProject(req.user.id, dishId, req.projectId)
  return res.json({ success: true })
})

app.post('/api/dishes', authRequired, projectAccessRequired, projectEditorOrOwnerOrAdminRequired, (req, res) => {
  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const recipe = String(req.body.recipe || '').trim()
  const cookingTimeMinutesRaw = req.body.cookingTimeMinutes
  const cookingTimeMinutes =
    cookingTimeMinutesRaw === null || cookingTimeMinutesRaw === undefined || String(cookingTimeMinutesRaw).trim() === ''
      ? null
      : Number(cookingTimeMinutesRaw)
  const mealCategoryId = Number(req.body.mealCategoryId)
  const typeCategoryId = Number(req.body.typeCategoryId)
  const components = Array.isArray(req.body.components) ? req.body.components : []

  if (!title) {
    return res.status(400).json({ message: 'Назва страви обовʼязкова' })
  }

  if (Number.isNaN(mealCategoryId) || Number.isNaN(typeCategoryId)) {
    return res.status(400).json({ message: 'Категорії страви мають бути числами' })
  }

  if (
    cookingTimeMinutes !== null &&
    (!Number.isInteger(cookingTimeMinutes) || cookingTimeMinutes < 1 || cookingTimeMinutes > 1440)
  ) {
    return res.status(400).json({ message: 'Час приготування має бути цілим числом від 1 до 1440 хвилин' })
  }

  const mealCategory = getCategoryByIdInProject(mealCategoryId, req.projectId)
  const typeCategory = getCategoryByIdInProject(typeCategoryId, req.projectId)

  if (!mealCategory || mealCategory.kind !== 'MEAL') {
    return res.status(400).json({ message: 'Некоректна категорія за часом дня' })
  }

  if (!typeCategory || typeCategory.kind !== 'TYPE') {
    return res.status(400).json({ message: 'Некоректна категорія за видом страви' })
  }

  try {
    const dish = createDishInProject({
      title,
      description,
      recipe,
      cookingTimeMinutes,
      projectId: req.projectId,
      mealCategoryId,
      typeCategoryId,
      components,
    })
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: req.projectId,
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
        projectId: req.projectId,
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

app.put('/api/dishes/:id', authRequired, projectAccessRequired, projectEditorOrOwnerOrAdminRequired, (req, res) => {
  const dishId = Number(req.params.id)
  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const recipe = String(req.body.recipe || '').trim()
  const cookingTimeMinutesRaw = req.body.cookingTimeMinutes
  const cookingTimeMinutes =
    cookingTimeMinutesRaw === null || cookingTimeMinutesRaw === undefined || String(cookingTimeMinutesRaw).trim() === ''
      ? null
      : Number(cookingTimeMinutesRaw)
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

  if (
    cookingTimeMinutes !== null &&
    (!Number.isInteger(cookingTimeMinutes) || cookingTimeMinutes < 1 || cookingTimeMinutes > 1440)
  ) {
    return res.status(400).json({ message: 'Час приготування має бути цілим числом від 1 до 1440 хвилин' })
  }

  const existingDish = getDishByIdInProject(dishId, req.projectId)
  if (!existingDish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  const mealCategory = getCategoryByIdInProject(mealCategoryId, req.projectId)
  const typeCategory = getCategoryByIdInProject(typeCategoryId, req.projectId)

  if (!mealCategory || mealCategory.kind !== 'MEAL') {
    return res.status(400).json({ message: 'Некоректна категорія за часом дня' })
  }

  if (!typeCategory || typeCategory.kind !== 'TYPE') {
    return res.status(400).json({ message: 'Некоректна категорія за видом страви' })
  }

  try {
    const dish = updateDishInProject({
      id: dishId,
      title,
      description,
      recipe,
      cookingTimeMinutes,
      projectId: req.projectId,
      mealCategoryId,
      typeCategoryId,
      components,
    })
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: req.projectId,
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
        projectId: req.projectId,
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
        projectId: req.projectId,
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

app.delete('/api/dishes/:id', authRequired, projectAccessRequired, projectEditorOrOwnerOrAdminRequired, (req, res) => {
  const dishId = Number(req.params.id)

  if (Number.isNaN(dishId)) {
    return res.status(400).json({ message: 'Некоректний id страви' })
  }

  const existingDish = getDishByIdInProject(dishId, req.projectId)
  if (!existingDish) {
    return res.status(404).json({ message: 'Страву не знайдено' })
  }

  try {
    deleteDish(dishId)
    const actorName = req.user.displayName || req.user.email

    addActivityLogSafe({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      projectId: req.projectId,
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

app.get('/api/menu-plan', authRequired, projectAccessRequired, (req, res) => {
  const menuDate = String(req.query.date || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate)) {
    return res.status(400).json({ message: 'date має бути у форматі YYYY-MM-DD' })
  }

  try {
    return res.json(getMenuEntriesByDateInProject(menuDate, req.projectId))
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.post('/api/menu-plan', authRequired, projectAccessRequired, (req, res) => {
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
    const menuEntry = createMenuEntryInProject({
      dishId,
      projectId: req.projectId,
      menuDate,
      components,
    })
    addShoppingItemsInProject(req.projectId, menuEntry.components || [])

    const actorName = req.user.displayName || req.user.email

    const dish = getDishByIdInProject(dishId, req.projectId)
    if (dish) {
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        projectId: req.projectId,
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

app.delete('/api/menu-plan/:id', authRequired, projectAccessRequired, (req, res) => {
  const menuEntryId = Number(req.params.id)

  if (Number.isNaN(menuEntryId)) {
    return res.status(400).json({ message: 'Некоректний id елемента меню' })
  }

  try {
    const menuEntry = getMenuEntryById(menuEntryId)

    if (menuEntry && Number(menuEntry.projectId) !== Number(req.projectId)) {
      return res.status(404).json({ message: 'Елемент меню не знайдено' })
    }

    const deleted = deleteMenuEntryById(menuEntryId)

    if (!deleted) {
      return res.status(404).json({ message: 'Елемент меню не знайдено' })
    }

    if (menuEntry) {
      const actorName = req.user.displayName || req.user.email
      addActivityLogSafe({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        projectId: req.projectId,
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
