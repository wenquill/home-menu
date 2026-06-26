import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const legacyDbPath = path.join(__dirname, 'data.sqlite')
const configuredDbPath = String(process.env.SQLITE_PATH || '').trim()

const dbPath = configuredDbPath
  ? (path.isAbsolute(configuredDbPath)
      ? configuredDbPath
      : path.resolve(process.cwd(), configuredDbPath))
  : legacyDbPath

function ensureDatabaseLocation(targetPath) {
  const targetDir = path.dirname(targetPath)
  fs.mkdirSync(targetDir, { recursive: true })

  if (targetPath === legacyDbPath) {
    return
  }

  const targetExists = fs.existsSync(targetPath)
  const legacyExists = fs.existsSync(legacyDbPath)

  if (!targetExists && legacyExists) {
    fs.copyFileSync(legacyDbPath, targetPath)
  }
}

ensureDatabaseLocation(dbPath)

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const defaultAvatarUrls = [
  '/default-avatars/avatar-1.svg',
  '/default-avatars/avatar-2.svg',
  '/default-avatars/avatar-3.svg',
  '/default-avatars/avatar-4.svg',
  '/default-avatars/avatar-5.svg',
  '/default-avatars/avatar-6.svg',
  '/default-avatars/avatar-7.svg',
  '/default-avatars/avatar-8.svg',
  '/default-avatars/avatar-9.svg',
  '/default-avatars/avatar-10.svg',
]

function pickRandomDefaultAvatar() {
  const randomIndex = Math.floor(Math.random() * defaultAvatarUrls.length)
  return defaultAvatarUrls[randomIndex]
}

function buildDefaultDisplayNameFromEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  const localPart = value.split('@')[0] || 'user'
  return localPart.slice(0, 40)
}

function normalizeDishComponents(components) {
  if (!Array.isArray(components)) {
    return []
  }

  const seen = new Set()

  return components
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .slice(0, 40)
}

function getDishComponentsByDishIds(dishIds) {
  if (!dishIds.length) {
    return new Map()
  }

  const placeholders = dishIds.map(() => '?').join(', ')
  const rows = db.prepare(
    `SELECT dish_id AS dishId, name
     FROM dish_components
     WHERE dish_id IN (${placeholders})
     ORDER BY position ASC, id ASC`,
  ).all(...dishIds)

  const componentsByDish = new Map()

  for (const row of rows) {
    const existing = componentsByDish.get(row.dishId) || []
    existing.push(row.name)
    componentsByDish.set(row.dishId, existing)
  }

  return componentsByDish
}

function attachDishComponents(dishes) {
  const dishIds = dishes.map((dish) => dish.id)
  const componentsByDish = getDishComponentsByDishIds(dishIds)

  return dishes.map((dish) => ({
    ...dish,
    components: componentsByDish.get(dish.id) || [],
  }))
}

function replaceDishComponents(dishId, components) {
  const normalized = normalizeDishComponents(components)

  db.prepare('DELETE FROM dish_components WHERE dish_id = ?').run(dishId)

  if (!normalized.length) {
    return
  }

  const insertComponent = db.prepare(
    'INSERT INTO dish_components (dish_id, name, position) VALUES (?, ?, ?)',
  )

  normalized.forEach((name, index) => {
    insertComponent.run(dishId, name, index)
  })
}

function getMenuEntryComponentsByEntryIds(menuEntryIds) {
  if (!menuEntryIds.length) {
    return new Map()
  }

  const placeholders = menuEntryIds.map(() => '?').join(', ')
  const rows = db.prepare(
    `SELECT menu_entry_id AS menuEntryId, name
     FROM menu_entry_components
     WHERE menu_entry_id IN (${placeholders})
     ORDER BY position ASC, id ASC`,
  ).all(...menuEntryIds)

  const componentsByMenuEntry = new Map()

  for (const row of rows) {
    const existing = componentsByMenuEntry.get(row.menuEntryId) || []
    existing.push(row.name)
    componentsByMenuEntry.set(row.menuEntryId, existing)
  }

  return componentsByMenuEntry
}

function replaceMenuEntryComponents(menuEntryId, components) {
  const normalized = normalizeDishComponents(components)

  db.prepare('DELETE FROM menu_entry_components WHERE menu_entry_id = ?').run(menuEntryId)

  if (!normalized.length) {
    return
  }

  const insertComponent = db.prepare(
    'INSERT INTO menu_entry_components (menu_entry_id, name, position) VALUES (?, ?, ?)',
  )

  normalized.forEach((name, index) => {
    insertComponent.run(menuEntryId, name, index)
  })
}

function selectMenuEntryComponents(selectedComponents, dishComponents) {
  const available = normalizeDishComponents(dishComponents)

  if (!Array.isArray(selectedComponents)) {
    return available
  }

  const selected = normalizeDishComponents(selectedComponents)
  const selectedSet = new Set(selected.map((item) => item.toLowerCase()))

  return available.filter((component) => selectedSet.has(component.toLowerCase()))
}

function normalizeMenuDate(menuDate) {
  const value = String(menuDate || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Некоректна дата меню')
  }

  return value
}

function normalizeActivityDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return {}
  }

  return details
}

function getMenuPlannedDishIdsByDate(menuDate) {
  const normalizedDate = normalizeMenuDate(menuDate)

  return db
    .prepare('SELECT id, dish_id AS dishId, menu_date AS menuDate FROM menu_entries WHERE menu_date = ? ORDER BY id DESC')
    .all(normalizedDate)
}

function attachMenuEntryComponents(menuEntries) {
  const menuEntryIds = menuEntries.map((entry) => entry.menuEntryId).filter(Boolean)
  const dishIds = menuEntries.map((entry) => entry.id)
  const componentsByMenuEntry = getMenuEntryComponentsByEntryIds(menuEntryIds)
  const componentsByDish = getDishComponentsByDishIds(dishIds)

  return menuEntries.map((entry) => {
    const entryComponents = componentsByMenuEntry.get(entry.menuEntryId)
    const fallbackDishComponents = componentsByDish.get(entry.id) || []

    return {
      ...entry,
      components: entryComponents !== undefined ? entryComponents : fallbackDishComponents,
    }
  })
}

function parseActivityLogDetails(detailsJson) {
  if (!detailsJson) {
    return {}
  }

  try {
    return JSON.parse(detailsJson)
  } catch (_error) {
    return {}
  }
}

function getActivityLogRowsForUser(userId, limit = 50) {
  return db
    .prepare(
      `SELECT
        l.id,
        l.actor_user_id AS actorUserId,
        l.actor_email AS actorEmail,
        u.display_name AS actorDisplayName,
        l.action,
        l.message,
        l.details_json AS detailsJson,
        l.created_at AS createdAt,
        CASE
          WHEN l.actor_user_id = ? OR r.activity_log_id IS NOT NULL THEN 1
          ELSE 0
        END AS isRead
       FROM activity_logs l
       LEFT JOIN users u
         ON u.id = l.actor_user_id
       LEFT JOIN activity_log_reads r
         ON r.activity_log_id = l.id
        AND r.user_id = ?
       ORDER BY l.id DESC
       LIMIT ?`,
    )
    .all(userId, userId, limit)
    .map((row) => {
      const actorName = String(row.actorDisplayName || '').trim() || row.actorEmail
      const originalMessage = String(row.message || '')
      const normalizedMessage =
        actorName && row.actorEmail && originalMessage.startsWith(`${row.actorEmail} `)
          ? `${actorName}${originalMessage.slice(row.actorEmail.length)}`
          : originalMessage

      return {
        ...row,
        actorDisplayName: actorName,
        message: normalizedMessage,
        details: parseActivityLogDetails(row.detailsJson),
        isRead: Boolean(row.isRead),
      }
    })
}

function seedCategories() {
  const mealCategories = ['Сніданки', 'Обіди', 'Вечері', 'Перекуси', 'Інше']
  const typeCategories = ['Закуски', 'Салати', 'Гарнір', 'Основне', 'Десерти']

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, kind) VALUES (@name, @kind)',
  )

  const transaction = db.transaction(() => {
    for (const name of mealCategories) {
      insertCategory.run({ name, kind: 'MEAL' })
    }

    for (const name of typeCategories) {
      insertCategory.run({ name, kind: 'TYPE' })
    }
  })

  transaction()
}

function seedDishes() {
  const categories = db
    .prepare('SELECT id, name, kind FROM categories')
    .all()
    .reduce((acc, item) => {
      acc[`${item.kind}:${item.name}`] = item.id
      return acc
    }, {})

  const initialDishes = [
    {
      title: 'Омлет з сиром та зеленню',
      description: 'Ніжний омлет на вершковому маслі з твердим сиром.',
      mealCategoryId: categories['MEAL:Сніданки'],
      typeCategoryId: categories['TYPE:Основне'],
    },
    {
      title: 'Тост з авокадо і яйцем',
      description: 'Хрусткий тост з кремовим авокадо та яйцем пашот.',
      mealCategoryId: categories['MEAL:Сніданки'],
      typeCategoryId: categories['TYPE:Закуски'],
    },
    {
      title: 'Цезар з куркою',
      description: 'Салат з соковитим філе, пармезаном і сухариками.',
      mealCategoryId: categories['MEAL:Обіди'],
      typeCategoryId: categories['TYPE:Салати'],
    },
    {
      title: 'Запечена риба з лимоном',
      description: 'Біла риба у духовці з травами та лимонною цедрою.',
      mealCategoryId: categories['MEAL:Вечері'],
      typeCategoryId: categories['TYPE:Основне'],
    },
    {
      title: 'Йогурт з ягодами',
      description: 'Грецький йогурт з полуницею, лохиною та медом.',
      mealCategoryId: categories['MEAL:Перекуси'],
      typeCategoryId: categories['TYPE:Десерти'],
    },
  ]

  const insertDish = db.prepare(
    `INSERT INTO dishes (title, description, meal_category_id, type_category_id)
     VALUES (@title, @description, @mealCategoryId, @typeCategoryId)`,
  )

  const transaction = db.transaction(() => {
    for (const dish of initialDishes) {
      insertDish.run(dish)
    }
  })

  transaction()
}

function seedAdminUser() {
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@home.menu').trim().toLowerCase()
  const adminPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim()
  const adminDisplayName = buildDefaultDisplayNameFromEmail(adminEmail)

  // Fallback password is admin123 for local development only.
  const fallbackPasswordHash = bcrypt.hashSync('admin123', 10)

  db.prepare(
    'INSERT INTO users (email, display_name, password_hash, role) VALUES (?, ?, ?, ?)',
  ).run(adminEmail, adminDisplayName, adminPasswordHash || fallbackPasswordHash, 'ADMIN')
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('MEAL', 'TYPE')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, kind)
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      recipe TEXT NOT NULL DEFAULT '',
      meal_category_id INTEGER NOT NULL,
      type_category_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meal_category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (type_category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS dish_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      menu_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
      UNIQUE(dish_id, menu_date)
    );

    CREATE TABLE IF NOT EXISTS menu_entry_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_entry_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (menu_entry_id) REFERENCES menu_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
      UNIQUE(user_id, dish_id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER NOT NULL,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_log_id INTEGER NOT NULL,
      read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id) ON DELETE CASCADE,
      UNIQUE(user_id, activity_log_id)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_kind ON categories(kind);
    CREATE INDEX IF NOT EXISTS idx_dishes_meal_category ON dishes(meal_category_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_type_category ON dishes(type_category_id);
    CREATE INDEX IF NOT EXISTS idx_dish_components_dish ON dish_components(dish_id);
    CREATE INDEX IF NOT EXISTS idx_menu_entries_date ON menu_entries(menu_date);
    CREATE INDEX IF NOT EXISTS idx_menu_entry_components_entry ON menu_entry_components(menu_entry_id);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_log_reads_user ON activity_log_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `)

  const userColumns = db.prepare("PRAGMA table_info('users')").all()
  const hasAvatarColumn = userColumns.some((column) => column.name === 'avatar_url')
  const hasDisplayNameColumn = userColumns.some((column) => column.name === 'display_name')

  if (!hasAvatarColumn) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
  }

  if (!hasDisplayNameColumn) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''")
  }

  db.prepare(
    `UPDATE users
     SET display_name = SUBSTR(email, 1, INSTR(email, '@') - 1)
     WHERE TRIM(display_name) = ''
       AND INSTR(email, '@') > 1`,
  ).run()

  const dishColumns = db.prepare("PRAGMA table_info('dishes')").all()
  const hasRecipeColumn = dishColumns.some((column) => column.name === 'recipe')

  if (!hasRecipeColumn) {
    db.exec("ALTER TABLE dishes ADD COLUMN recipe TEXT NOT NULL DEFAULT ''")
  }

  const menuEntryColumns = db.prepare("PRAGMA table_info('menu_entries')").all()
  const hasMenuEntryTable = menuEntryColumns.length > 0

  if (!hasMenuEntryTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS menu_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dish_id INTEGER NOT NULL,
        menu_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
        UNIQUE(dish_id, menu_date)
      );
      CREATE INDEX IF NOT EXISTS idx_menu_entries_date ON menu_entries(menu_date);
    `)
  }

  const menuEntryComponentColumns = db.prepare("PRAGMA table_info('menu_entry_components')").all()
  const hasMenuEntryComponentsTable = menuEntryComponentColumns.length > 0

  if (!hasMenuEntryComponentsTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS menu_entry_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_entry_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_entry_id) REFERENCES menu_entries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_menu_entry_components_entry ON menu_entry_components(menu_entry_id);
    `)
  }

  const favoriteColumns = db.prepare("PRAGMA table_info('user_favorites')").all()
  const hasFavoritesTable = favoriteColumns.length > 0

  if (!hasFavoritesTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        dish_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
        UNIQUE(user_id, dish_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
    `)
  }

  const activityLogColumns = db.prepare("PRAGMA table_info('activity_logs')").all()
  const hasActivityLogTable = activityLogColumns.length > 0

  if (!hasActivityLogTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER NOT NULL,
        actor_email TEXT NOT NULL,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    `)
  }

  const activityLogReadColumns = db.prepare("PRAGMA table_info('activity_log_reads')").all()
  const hasActivityLogReadTable = activityLogReadColumns.length > 0

  if (!hasActivityLogReadTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_log_id INTEGER NOT NULL,
        read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id) ON DELETE CASCADE,
        UNIQUE(user_id, activity_log_id)
      );
      CREATE INDEX IF NOT EXISTS idx_activity_log_reads_user ON activity_log_reads(user_id);
    `)
  }

  const adminCount = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'")
    .get()

  if (adminCount.count === 0) {
    seedAdminUser()
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get()

  if (categoryCount.count === 0) {
    seedCategories()
  }

  const dishCount = db.prepare('SELECT COUNT(*) AS count FROM dishes').get()

  if (dishCount.count === 0) {
    seedDishes()
  }
}

export function getCategories(kind) {
  if (kind) {
    return db
      .prepare('SELECT id, name, kind FROM categories WHERE kind = ? ORDER BY id')
      .all(kind)
  }

  return db.prepare('SELECT id, name, kind FROM categories ORDER BY id').all()
}

export function getCategoryById(id) {
  return db.prepare('SELECT id, name, kind FROM categories WHERE id = ?').get(id)
}

export function createCategory({ name, kind }) {
  const result = db
    .prepare('INSERT INTO categories (name, kind) VALUES (?, ?)')
    .run(name, kind)

  return db
    .prepare('SELECT id, name, kind FROM categories WHERE id = ?')
    .get(result.lastInsertRowid)
}

export function getDishes(categoryId) {
  if (categoryId) {
    const dishes = db
      .prepare(
        `SELECT
          d.id,
          d.title,
          d.description,
          d.recipe,
          d.meal_category_id AS mealCategoryId,
          d.type_category_id AS typeCategoryId,
          meal.name AS mealCategoryName,
          type.name AS typeCategoryName
         FROM dishes d
         JOIN categories meal ON meal.id = d.meal_category_id
         JOIN categories type ON type.id = d.type_category_id
         WHERE d.meal_category_id = ? OR d.type_category_id = ?
         ORDER BY d.id DESC`,
      )
      .all(categoryId, categoryId)

    return attachDishComponents(dishes)
  }

  const dishes = db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM dishes d
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       ORDER BY d.id DESC`,
    )
    .all()

  return attachDishComponents(dishes)
}

export function getDishById(id) {
  const dish = db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM dishes d
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE d.id = ?`,
    )
    .get(id)

  if (!dish) {
    return null
  }

  const [dishWithComponents] = attachDishComponents([dish])
  return dishWithComponents
}

export function getMenuEntryById(id) {
  const menuEntry = db
    .prepare(
      `SELECT
        me.id AS menuEntryId,
        me.menu_date AS menuDate,
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM menu_entries me
       JOIN dishes d ON d.id = me.dish_id
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE me.id = ?`,
    )
    .get(id)

  if (!menuEntry) {
    return null
  }

  const [menuEntryWithComponents] = attachMenuEntryComponents([menuEntry])
  return menuEntryWithComponents
}

export function createDish({ title, description, recipe = '', mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO dishes (title, description, recipe, meal_category_id, type_category_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(title, description, recipe, mealCategoryId, typeCategoryId)

    const dishId = Number(result.lastInsertRowid)
    replaceDishComponents(dishId, components)
    return dishId
  })

  const dishId = transaction()
  return getDishById(dishId)
}

export function updateDish({ id, title, description, recipe = '', mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE dishes
       SET title = ?, description = ?, recipe = ?, meal_category_id = ?, type_category_id = ?
       WHERE id = ?`,
    ).run(title, description, recipe, mealCategoryId, typeCategoryId, id)

    replaceDishComponents(id, components)
  })

  transaction()

  return getDishById(id)
}

export function deleteDish(id) {
  const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(id)
  return result.changes > 0
}

export function createMenuEntry({ dishId, menuDate, components }) {
  const normalizedDate = normalizeMenuDate(menuDate)
  const existingDish = getDishById(dishId)

  if (!existingDish) {
    throw new Error('Страву не знайдено')
  }

  const selectedComponents = selectMenuEntryComponents(components, existingDish.components || [])

  const result = db.transaction(() => {
    const insertResult = db
      .prepare('INSERT INTO menu_entries (dish_id, menu_date) VALUES (?, ?)')
      .run(dishId, normalizedDate)

    const menuEntryId = Number(insertResult.lastInsertRowid)
    replaceMenuEntryComponents(menuEntryId, selectedComponents)

    return insertResult
  })()

  return db
    .prepare('SELECT id, dish_id AS dishId, menu_date AS menuDate FROM menu_entries WHERE id = ?')
    .get(result.lastInsertRowid)
}

export function deleteMenuEntryById(id) {
  const result = db.prepare('DELETE FROM menu_entries WHERE id = ?').run(id)
  return result.changes > 0
}

export function getMenuEntriesByDate(menuDate) {
  const normalizedDate = normalizeMenuDate(menuDate)

  const menuEntries = db
    .prepare(
      `SELECT
        me.id AS menuEntryId,
        me.menu_date AS menuDate,
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM menu_entries me
       JOIN dishes d ON d.id = me.dish_id
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE me.menu_date = ?
       ORDER BY me.id DESC`,
    )
    .all(normalizedDate)

  return attachMenuEntryComponents(menuEntries)
}

export function getFavoriteDishIdsForUser(userId) {
  const rows = db
    .prepare(
      `SELECT dish_id AS dishId
       FROM user_favorites
       WHERE user_id = ?
       ORDER BY id DESC`,
    )
    .all(userId)

  return rows.map((row) => Number(row.dishId))
}

export function addFavoriteDishForUser(userId, dishId) {
  const result = db
    .prepare('INSERT OR IGNORE INTO user_favorites (user_id, dish_id) VALUES (?, ?)')
    .run(userId, dishId)

  return result.changes > 0
}

export function removeFavoriteDishForUser(userId, dishId) {
  const result = db
    .prepare('DELETE FROM user_favorites WHERE user_id = ? AND dish_id = ?')
    .run(userId, dishId)

  return result.changes > 0
}

export function getUserByEmail(email) {
  return db
    .prepare(
      `SELECT
        id,
        email,
        display_name AS displayName,
        password_hash AS passwordHash,
        role,
        avatar_url AS avatarUrl
       FROM users
       WHERE email = ?`,
    )
    .get(email)
}

export function getUserById(id) {
  return db
    .prepare(
      `SELECT
        id,
        email,
        display_name AS displayName,
        role,
        avatar_url AS avatarUrl
       FROM users
       WHERE id = ?`,
    )
    .get(id)
}

export function createUser({ email, displayName = '', passwordHash, role = 'USER' }) {
  const avatarUrl = pickRandomDefaultAvatar()
  const normalizedDisplayName = String(displayName || '').trim() || buildDefaultDisplayNameFromEmail(email)

  const result = db
    .prepare('INSERT INTO users (email, display_name, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)')
    .run(email, normalizedDisplayName, passwordHash, role, avatarUrl)

  return getUserById(result.lastInsertRowid)
}

export function updateUserById({ id, email, displayName, passwordHash, avatarUrl }) {
  const normalizedDisplayName = String(displayName || '').trim() || buildDefaultDisplayNameFromEmail(email)

  db.prepare(
    `UPDATE users
     SET email = ?, display_name = ?, password_hash = ?, avatar_url = ?
     WHERE id = ?`,
  ).run(email, normalizedDisplayName, passwordHash, avatarUrl, id)

  return getUserById(id)
}

export function createActivityLog({ actorUserId, actorEmail, action, message, details = {} }) {
  const normalizedDetails = normalizeActivityDetails(details)

  const result = db
    .prepare(
      'INSERT INTO activity_logs (actor_user_id, actor_email, action, message, details_json) VALUES (?, ?, ?, ?, ?)',
    )
    .run(actorUserId, actorEmail, action, message, JSON.stringify(normalizedDetails))

  return db
    .prepare(
      `SELECT
        id,
        actor_user_id AS actorUserId,
        actor_email AS actorEmail,
        action,
        message,
        details_json AS detailsJson,
        created_at AS createdAt
       FROM activity_logs
       WHERE id = ?`,
    )
    .get(result.lastInsertRowid)
}

export function getRecentActivityLogs(limit = 50) {
  return getActivityLogRowsForUser(0, limit)
}

export function getRecentActivityLogsForUser(userId, limit = 50) {
  return getActivityLogRowsForUser(userId, limit)
}

export function markActivityLogsAsReadForUser(userId, logIds = []) {
  const normalizedIds = logIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)

  if (!normalizedIds.length) {
    return 0
  }

  const placeholders = normalizedIds.map(() => '?').join(', ')
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO activity_log_reads (user_id, activity_log_id)
       SELECT ?, l.id
       FROM activity_logs l
       WHERE l.id IN (${placeholders})
         AND l.actor_user_id != ?`,
    )
    .run(userId, ...normalizedIds, userId)

  return result.changes
}

export function getUnreadActivityLogsCountForUser(userId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM activity_logs l
       LEFT JOIN activity_log_reads r
         ON r.activity_log_id = l.id
        AND r.user_id = ?
       WHERE l.actor_user_id != ?
         AND r.activity_log_id IS NULL`,
    )
    .get(userId, userId)

  return Number(row?.count || 0)
}
