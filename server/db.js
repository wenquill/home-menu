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

function normalizeProjectName(name) {
  return String(name || '').trim()
}

function normalizeProjectNotes(notes) {
  return String(notes || '').trim()
}

function normalizeShoppingItemText(text) {
  return String(text || '').trim()
}

function normalizeMenuSpecialSourceType(sourceType) {
  const value = String(sourceType || '').trim().toUpperCase()

  if (value === 'DELIVERY' || value === 'STORE_READY' || value === 'HOMEMADE_GIFT' || value === 'OTHER') {
    return value
  }

  throw new Error('Некоректний тип альтернативного плану')
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

function resolveActivityLogProjectId(actorUserId, projectId) {
  const normalizedProjectId = Number(projectId)

  if (Number.isInteger(normalizedProjectId) && normalizedProjectId > 0) {
    return normalizedProjectId
  }

  const actorId = Number(actorUserId)
  if (Number.isInteger(actorId) && actorId > 0) {
    const row = db
      .prepare(
        `SELECT
          u.current_project_id AS currentProjectId,
          (
            SELECT pm.project_id
            FROM project_memberships pm
            WHERE pm.user_id = u.id
            ORDER BY pm.project_id ASC
            LIMIT 1
          ) AS firstProjectId
         FROM users u
         WHERE u.id = ?
         LIMIT 1`,
      )
      .get(actorId)

    const fallbackProjectId = Number(row?.currentProjectId)
    if (Number.isInteger(fallbackProjectId) && fallbackProjectId > 0) {
      return fallbackProjectId
    }

    const firstProjectId = Number(row?.firstProjectId)
    if (Number.isInteger(firstProjectId) && firstProjectId > 0) {
      return firstProjectId
    }
  }

  return null
}

function getActivityLogRowsForUser(userId, limit = 50, projectId = null) {
  const normalizedProjectId = Number(projectId)

  const hasProjectFilter = Number.isInteger(normalizedProjectId) && normalizedProjectId > 0

  const rows = hasProjectFilter
    ? db
      .prepare(
        `SELECT
          l.id,
          l.actor_user_id AS actorUserId,
          l.actor_email AS actorEmail,
          u.display_name AS actorDisplayName,
          l.action,
          l.message,
          l.project_id AS projectId,
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
         WHERE l.project_id = ?
         ORDER BY l.id DESC
         LIMIT ?`,
      )
      .all(userId, userId, normalizedProjectId, limit)
    : db
      .prepare(
        `SELECT
          l.id,
          l.actor_user_id AS actorUserId,
          l.actor_email AS actorEmail,
          u.display_name AS actorDisplayName,
          l.action,
          l.message,
          l.project_id AS projectId,
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

  return rows
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

function getDefaultProject() {
  return db.prepare('SELECT id, name FROM projects ORDER BY id ASC LIMIT 1').get()
}

function ensureDefaultProject() {
  const existing = getDefaultProject()
  if (existing) {
    return existing
  }

  const result = db.prepare('INSERT INTO projects (name, created_by_user_id) VALUES (?, NULL)').run('default')
  return db.prepare('SELECT id, name FROM projects WHERE id = ?').get(result.lastInsertRowid)
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
      current_project_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS project_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
      permissions_role TEXT NOT NULL DEFAULT 'MEMBER',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('MEAL', 'TYPE')),
      project_id INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, kind, project_id)
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      recipe TEXT NOT NULL DEFAULT '',
      cooking_time_minutes INTEGER,
      project_id INTEGER NOT NULL DEFAULT 1,
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
      project_id INTEGER NOT NULL DEFAULT 1,
      menu_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
      UNIQUE(dish_id, menu_date, project_id)
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
      project_id INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
      UNIQUE(user_id, dish_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER NOT NULL,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      project_id INTEGER NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      normalized_text TEXT NOT NULL,
      is_checked INTEGER NOT NULL DEFAULT 0,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, normalized_text)
    );

    CREATE TABLE IF NOT EXISTS saved_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_tried INTEGER NOT NULL DEFAULT 0,
      tried_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_special_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      menu_date TEXT NOT NULL,
      source_type TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_project_memberships_user ON project_memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_memberships_project ON project_memberships(project_id);
    CREATE INDEX IF NOT EXISTS idx_categories_kind ON categories(kind);
    CREATE INDEX IF NOT EXISTS idx_dishes_meal_category ON dishes(meal_category_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_type_category ON dishes(type_category_id);
    CREATE INDEX IF NOT EXISTS idx_dish_components_dish ON dish_components(dish_id);
    CREATE INDEX IF NOT EXISTS idx_menu_entries_date ON menu_entries(menu_date);
    CREATE INDEX IF NOT EXISTS idx_menu_entry_components_entry ON menu_entry_components(menu_entry_id);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_log_reads_user ON activity_log_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_project ON shopping_list_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_saved_recipes_user ON saved_recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_menu_special_entries_project_date ON menu_special_entries(project_id, menu_date);
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

  const hasCurrentProjectColumn = userColumns.some((column) => column.name === 'current_project_id')

  if (!hasCurrentProjectColumn) {
    db.exec('ALTER TABLE users ADD COLUMN current_project_id INTEGER')
  }

  db.prepare(
    `UPDATE users
     SET display_name = SUBSTR(email, 1, INSTR(email, '@') - 1)
     WHERE TRIM(display_name) = ''
       AND INSTR(email, '@') > 1`,
  ).run()

  const dishColumns = db.prepare("PRAGMA table_info('dishes')").all()
  const hasRecipeColumn = dishColumns.some((column) => column.name === 'recipe')
  const hasCookingTimeColumn = dishColumns.some((column) => column.name === 'cooking_time_minutes')
  const hasDishProjectColumn = dishColumns.some((column) => column.name === 'project_id')

  if (!hasRecipeColumn) {
    db.exec("ALTER TABLE dishes ADD COLUMN recipe TEXT NOT NULL DEFAULT ''")
  }

  if (!hasCookingTimeColumn) {
    db.exec('ALTER TABLE dishes ADD COLUMN cooking_time_minutes INTEGER')
  }

  if (!hasDishProjectColumn) {
    db.exec('ALTER TABLE dishes ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1')
  }

  const categoryColumns = db.prepare("PRAGMA table_info('categories')").all()
  const hasCategoryProjectColumn = categoryColumns.some((column) => column.name === 'project_id')

  if (!hasCategoryProjectColumn) {
    db.exec('ALTER TABLE categories ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1')
  }

  const menuEntryColumns = db.prepare("PRAGMA table_info('menu_entries')").all()
  const hasMenuEntryTable = menuEntryColumns.length > 0
  const hasMenuEntryProjectColumn = menuEntryColumns.some((column) => column.name === 'project_id')
  const hasMenuEntryIsCookedColumn = menuEntryColumns.some((column) => column.name === 'is_cooked')

  if (hasMenuEntryTable && !hasMenuEntryIsCookedColumn) {
    db.exec('ALTER TABLE menu_entries ADD COLUMN is_cooked INTEGER NOT NULL DEFAULT 0')
    db.exec('ALTER TABLE menu_entries ADD COLUMN cooked_at TEXT')
  }

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

  if (hasMenuEntryTable && !hasMenuEntryProjectColumn) {
    db.exec('ALTER TABLE menu_entries ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1')
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
  const hasFavoriteProjectColumn = favoriteColumns.some((column) => column.name === 'project_id')

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

  if (hasFavoritesTable && !hasFavoriteProjectColumn) {
    db.exec('ALTER TABLE user_favorites ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1')
  }

  const projectColumns = db.prepare("PRAGMA table_info('projects')").all()
  const hasProjectsTable = projectColumns.length > 0
  const hasProjectNotesColumn = projectColumns.some((column) => column.name === 'notes')

  if (!hasProjectsTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_by_user_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by_user_id);
    `)
  }

  if (hasProjectsTable && !hasProjectNotesColumn) {
    db.exec("ALTER TABLE projects ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
  }

  const membershipColumns = db.prepare("PRAGMA table_info('project_memberships')").all()
  const hasMembershipsTable = membershipColumns.length > 0

  if (!hasMembershipsTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
        permissions_role TEXT NOT NULL DEFAULT 'MEMBER',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(user_id, project_id)
      );
      CREATE INDEX IF NOT EXISTS idx_project_memberships_user ON project_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_memberships_project ON project_memberships(project_id);
    `)
  }

  const hasMembershipPermissionsRoleColumn = membershipColumns.some((column) => column.name === 'permissions_role')
  if (hasMembershipsTable && !hasMembershipPermissionsRoleColumn) {
    db.exec("ALTER TABLE project_memberships ADD COLUMN permissions_role TEXT NOT NULL DEFAULT 'MEMBER'")
  }

  db.prepare(
    `UPDATE project_memberships
     SET permissions_role = CASE
       WHEN role = 'OWNER' THEN 'EDITOR'
       ELSE 'MEMBER'
     END
     WHERE permissions_role IS NULL OR TRIM(permissions_role) = ''`,
  ).run()

  const activityLogColumns = db.prepare("PRAGMA table_info('activity_logs')").all()
  const hasActivityLogTable = activityLogColumns.length > 0
  const hasActivityLogProjectColumn = activityLogColumns.some((column) => column.name === 'project_id')

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

  if (hasActivityLogTable && !hasActivityLogProjectColumn) {
    db.exec('ALTER TABLE activity_logs ADD COLUMN project_id INTEGER NOT NULL DEFAULT 1')
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

  const shoppingListColumns = db.prepare("PRAGMA table_info('shopping_list_items')").all()
  const hasShoppingListTable = shoppingListColumns.length > 0

  if (!hasShoppingListTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        is_checked INTEGER NOT NULL DEFAULT 0,
        sort_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, normalized_text)
      );
      CREATE INDEX IF NOT EXISTS idx_shopping_list_project ON shopping_list_items(project_id);
    `)
  }

  const savedRecipesColumns = db.prepare("PRAGMA table_info('saved_recipes')").all()
  const hasSavedRecipesTable = savedRecipesColumns.length > 0
  const hasSavedRecipeTriedColumn = savedRecipesColumns.some((column) => column.name === 'is_tried')
  const hasSavedRecipeTriedAtColumn = savedRecipesColumns.some((column) => column.name === 'tried_at')

  if (!hasSavedRecipesTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        link TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        is_tried INTEGER NOT NULL DEFAULT 0,
        tried_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_saved_recipes_user ON saved_recipes(user_id);
    `)
  }

  if (hasSavedRecipesTable && !hasSavedRecipeTriedColumn) {
    db.exec('ALTER TABLE saved_recipes ADD COLUMN is_tried INTEGER NOT NULL DEFAULT 0')
  }

  if (hasSavedRecipesTable && !hasSavedRecipeTriedAtColumn) {
    db.exec('ALTER TABLE saved_recipes ADD COLUMN tried_at TEXT')
  }

  const menuSpecialColumns = db.prepare("PRAGMA table_info('menu_special_entries')").all()
  const hasMenuSpecialTable = menuSpecialColumns.length > 0

  if (!hasMenuSpecialTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS menu_special_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        menu_date TEXT NOT NULL,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_by_user_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_menu_special_entries_project_date ON menu_special_entries(project_id, menu_date);
    `)
  }

  const adminCount = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'")
    .get()

  if (adminCount.count === 0) {
    seedAdminUser()
  }

  const defaultProject = ensureDefaultProject()

  db.prepare(
     `INSERT OR IGNORE INTO project_memberships (user_id, project_id, role, permissions_role)
      SELECT id, ?, 'OWNER', 'EDITOR' FROM users WHERE role = 'ADMIN'`,
  ).run(defaultProject.id)

  db.prepare(
    `UPDATE users
     SET current_project_id = ?
     WHERE role = 'ADMIN' AND current_project_id IS NULL`,
  ).run(defaultProject.id)

  // Create project-scoped indexes only after migration columns definitely exist.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_categories_project ON categories(project_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_project ON dishes(project_id);
    CREATE INDEX IF NOT EXISTS idx_menu_entries_project ON menu_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_project ON user_favorites(project_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_project ON shopping_list_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_menu_special_entries_project_date ON menu_special_entries(project_id, menu_date);
  `)

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

export function getCategoriesByProject(projectId, kind) {
  if (kind) {
    return db
      .prepare('SELECT id, name, kind FROM categories WHERE project_id = ? AND kind = ? ORDER BY id')
      .all(projectId, kind)
  }

  return db.prepare('SELECT id, name, kind FROM categories WHERE project_id = ? ORDER BY id').all(projectId)
}

export function getCategoryById(id) {
  return db.prepare('SELECT id, name, kind FROM categories WHERE id = ?').get(id)
}

export function getCategoryByIdInProject(id, projectId) {
  return db
    .prepare('SELECT id, name, kind FROM categories WHERE id = ? AND project_id = ?')
    .get(id, projectId)
}

export function createCategory({ name, kind }) {
  const result = db
    .prepare('INSERT INTO categories (name, kind) VALUES (?, ?)')
    .run(name, kind)

  return db
    .prepare('SELECT id, name, kind FROM categories WHERE id = ?')
    .get(result.lastInsertRowid)
}

export function createCategoryInProject({ name, kind, projectId }) {
  const result = db
    .prepare('INSERT INTO categories (name, kind, project_id) VALUES (?, ?, ?)')
    .run(name, kind, projectId)

  return db
    .prepare('SELECT id, name, kind FROM categories WHERE id = ?')
    .get(result.lastInsertRowid)
}

export function deleteCategoryInProject({ id, projectId }) {
  const categoryId = Number(id)
  const normalizedProjectId = Number(projectId)

  if (!Number.isInteger(categoryId) || categoryId < 1) {
    return { deleted: false, reason: 'INVALID_ID' }
  }

  const usage = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM dishes
       WHERE project_id = ? AND (meal_category_id = ? OR type_category_id = ?)`,
    )
    .get(normalizedProjectId, categoryId, categoryId)

  if ((usage?.count || 0) > 0) {
    return { deleted: false, reason: 'CATEGORY_IN_USE' }
  }

  const result = db
    .prepare('DELETE FROM categories WHERE id = ? AND project_id = ?')
    .run(categoryId, normalizedProjectId)

  return {
    deleted: result.changes > 0,
  }
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
        d.cooking_time_minutes AS cookingTimeMinutes,
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

export function getDishesByProject(projectId, categoryId) {
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
         WHERE d.project_id = ?
           AND (d.meal_category_id = ? OR d.type_category_id = ?)
         ORDER BY d.id DESC`,
      )
      .all(projectId, categoryId, categoryId)

    return attachDishComponents(dishes)
  }

  const dishes = db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.cooking_time_minutes AS cookingTimeMinutes,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM dishes d
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE d.project_id = ?
       ORDER BY d.id DESC`,
    )
    .all(projectId)

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
        d.cooking_time_minutes AS cookingTimeMinutes,
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

export function getDishByIdInProject(id, projectId) {
  const dish = db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.cooking_time_minutes AS cookingTimeMinutes,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM dishes d
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE d.id = ? AND d.project_id = ?`,
    )
    .get(id, projectId)

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
        me.project_id AS projectId,
        me.menu_date AS menuDate,
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.cooking_time_minutes AS cookingTimeMinutes,
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

export function createDish({ title, description, recipe = '', cookingTimeMinutes = null, mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO dishes (title, description, recipe, cooking_time_minutes, meal_category_id, type_category_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(title, description, recipe, cookingTimeMinutes, mealCategoryId, typeCategoryId)

    const dishId = Number(result.lastInsertRowid)
    replaceDishComponents(dishId, components)
    return dishId
  })

  const dishId = transaction()
  return getDishById(dishId)
}

export function createDishInProject({ title, description, recipe = '', cookingTimeMinutes = null, projectId, mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO dishes (title, description, recipe, cooking_time_minutes, project_id, meal_category_id, type_category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(title, description, recipe, cookingTimeMinutes, projectId, mealCategoryId, typeCategoryId)

    const dishId = Number(result.lastInsertRowid)
    replaceDishComponents(dishId, components)
    return dishId
  })

  const dishId = transaction()
  return getDishById(dishId)
}

export function updateDish({ id, title, description, recipe = '', cookingTimeMinutes = null, mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE dishes
       SET title = ?, description = ?, recipe = ?, cooking_time_minutes = ?, meal_category_id = ?, type_category_id = ?
       WHERE id = ?`,
    ).run(title, description, recipe, cookingTimeMinutes, mealCategoryId, typeCategoryId, id)

    replaceDishComponents(id, components)
  })

  transaction()

  return getDishById(id)
}

export function updateDishInProject({ id, title, description, recipe = '', cookingTimeMinutes = null, projectId, mealCategoryId, typeCategoryId, components = [] }) {
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE dishes
       SET title = ?, description = ?, recipe = ?, cooking_time_minutes = ?, meal_category_id = ?, type_category_id = ?
       WHERE id = ? AND project_id = ?`,
    ).run(title, description, recipe, cookingTimeMinutes, mealCategoryId, typeCategoryId, id, projectId)

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

  const menuEntry = db
    .prepare('SELECT id, dish_id AS dishId, menu_date AS menuDate FROM menu_entries WHERE id = ?')
    .get(result.lastInsertRowid)

  return {
    ...menuEntry,
    components: selectedComponents,
  }
}

export function createMenuEntryInProject({ dishId, projectId, menuDate, components }) {
  const normalizedDate = normalizeMenuDate(menuDate)
  const existingDish = getDishByIdInProject(dishId, projectId)

  if (!existingDish) {
    throw new Error('Страву не знайдено')
  }

  const selectedComponents = selectMenuEntryComponents(components, existingDish.components || [])

  const result = db.transaction(() => {
    const insertResult = db
      .prepare('INSERT INTO menu_entries (dish_id, project_id, menu_date) VALUES (?, ?, ?)')
      .run(dishId, projectId, normalizedDate)

    const menuEntryId = Number(insertResult.lastInsertRowid)
    replaceMenuEntryComponents(menuEntryId, selectedComponents)

    return insertResult
  })()

  const menuEntry = db
    .prepare('SELECT id, dish_id AS dishId, menu_date AS menuDate FROM menu_entries WHERE id = ?')
    .get(result.lastInsertRowid)

  return {
    ...menuEntry,
    components: selectedComponents,
  }
}

export function deleteMenuEntryById(id) {
  const result = db.prepare('DELETE FROM menu_entries WHERE id = ?').run(id)
  return result.changes > 0
}

export function setMenuEntryCookedInProject({ id, projectId, isCooked }) {
  const menuEntryId = Number(id)
  const normalizedProjectId = Number(projectId)

  const row = db
    .prepare('SELECT id FROM menu_entries WHERE id = ? AND project_id = ?')
    .get(menuEntryId, normalizedProjectId)

  if (!row) {
    return null
  }

  const cookedAt = isCooked ? new Date().toISOString() : null

  db.prepare('UPDATE menu_entries SET is_cooked = ?, cooked_at = ? WHERE id = ?')
    .run(isCooked ? 1 : 0, cookedAt, menuEntryId)

  return db
    .prepare('SELECT id, is_cooked AS isCooked, cooked_at AS cookedAt FROM menu_entries WHERE id = ?')
    .get(menuEntryId)
}

export function getDishCookStatsByProject(projectId, limit = 10) {
  return db
    .prepare(
      `SELECT
        d.id AS dishId,
        d.title AS dishTitle,
        COUNT(*) AS cookCount
       FROM menu_entries me
       JOIN dishes d ON d.id = me.dish_id
       WHERE me.project_id = ?
         AND me.is_cooked = 1
       GROUP BY me.dish_id
       ORDER BY cookCount DESC, d.title ASC
       LIMIT ?`,
    )
    .all(projectId, limit)
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
        d.cooking_time_minutes AS cookingTimeMinutes,
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

export function getMenuEntriesByDateInProject(menuDate, projectId) {
  const normalizedDate = normalizeMenuDate(menuDate)

  const menuEntries = db
    .prepare(
      `SELECT
        me.id AS menuEntryId,
        me.menu_date AS menuDate,
        me.is_cooked AS isCooked,
        me.cooked_at AS cookedAt,
        d.id,
        d.title,
        d.description,
        d.recipe,
        d.cooking_time_minutes AS cookingTimeMinutes,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM menu_entries me
       JOIN dishes d ON d.id = me.dish_id
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE me.menu_date = ?
         AND me.project_id = ?
       ORDER BY me.id DESC`,
    )
    .all(normalizedDate, projectId)

  return attachMenuEntryComponents(menuEntries)
}

export function getMenuSpecialEntriesByDateInProject(menuDate, projectId) {
  const normalizedDate = normalizeMenuDate(menuDate)

  return db
    .prepare(
      `SELECT
        id,
        project_id AS projectId,
        menu_date AS menuDate,
        source_type AS sourceType,
        title,
        notes,
        created_by_user_id AS createdByUserId,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM menu_special_entries
       WHERE project_id = ?
         AND menu_date = ?
       ORDER BY id DESC`,
    )
    .all(projectId, normalizedDate)
}

export function getMenuSpecialEntryByIdInProject(id, projectId) {
  return db
    .prepare(
      `SELECT
        id,
        project_id AS projectId,
        menu_date AS menuDate,
        source_type AS sourceType,
        title,
        notes,
        created_by_user_id AS createdByUserId,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM menu_special_entries
       WHERE id = ?
         AND project_id = ?`,
    )
    .get(id, projectId)
}

export function createMenuSpecialEntryInProject({ projectId, menuDate, sourceType, title, notes = '', createdByUserId = null }) {
  const normalizedDate = normalizeMenuDate(menuDate)
  const normalizedSourceType = normalizeMenuSpecialSourceType(sourceType)
  const normalizedTitle = String(title || '').trim()
  const normalizedNotes = String(notes || '').trim()

  if (!normalizedTitle) {
    throw new Error('Назва альтернативного плану обовʼязкова')
  }

  const result = db
    .prepare(
      `INSERT INTO menu_special_entries (project_id, menu_date, source_type, title, notes, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, normalizedDate, normalizedSourceType, normalizedTitle, normalizedNotes, createdByUserId)

  return getMenuSpecialEntryByIdInProject(Number(result.lastInsertRowid), projectId)
}

export function deleteMenuSpecialEntryByIdInProject({ id, projectId }) {
  const result = db
    .prepare('DELETE FROM menu_special_entries WHERE id = ? AND project_id = ?')
    .run(id, projectId)

  return result.changes > 0
}

function getNextShoppingSortIndex(projectId) {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_index), 0) + 1 AS nextSortIndex FROM shopping_list_items WHERE project_id = ?')
    .get(projectId)

  return Number(row?.nextSortIndex || 1)
}

function getShoppingItemByIdInProject(id, projectId) {
  return db
    .prepare(
      `SELECT
        id,
        project_id AS projectId,
        text,
        is_checked AS isChecked,
        sort_index AS sortIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM shopping_list_items
       WHERE id = ? AND project_id = ?`,
    )
    .get(id, projectId)
}

export function getShoppingListItemsByProject(projectId) {
  const rows = db
    .prepare(
      `SELECT
        id,
        project_id AS projectId,
        text,
        is_checked AS isChecked,
        sort_index AS sortIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM shopping_list_items
       WHERE project_id = ?
       ORDER BY is_checked ASC, sort_index ASC, id ASC`,
    )
    .all(projectId)

  return rows.map((row) => ({
    ...row,
    isChecked: Boolean(row.isChecked),
  }))
}

export function addShoppingItemInProject({ projectId, text, checked = false }) {
  const normalizedText = normalizeShoppingItemText(text)
  if (!normalizedText) {
    throw new Error('Назва елемента списку обовʼязкова')
  }

  const normalizedKey = normalizedText.toLowerCase()

  const itemId = db.transaction(() => {
    const existing = db
      .prepare('SELECT id, is_checked AS isChecked FROM shopping_list_items WHERE project_id = ? AND normalized_text = ? LIMIT 1')
      .get(projectId, normalizedKey)

    const nextSortIndex = getNextShoppingSortIndex(projectId)
    const checkedValue = checked ? 1 : 0

    if (existing) {
      db
        .prepare(
          `UPDATE shopping_list_items
           SET text = ?,
               is_checked = ?,
               sort_index = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .run(normalizedText, checkedValue, nextSortIndex, existing.id)

      return existing.id
    }

    const result = db
      .prepare(
        `INSERT INTO shopping_list_items (project_id, text, normalized_text, is_checked, sort_index)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(projectId, normalizedText, normalizedKey, checkedValue, nextSortIndex)

    return Number(result.lastInsertRowid)
  })()

  const item = getShoppingItemByIdInProject(itemId, projectId)
  return {
    ...item,
    isChecked: Boolean(item?.isChecked),
  }
}

export function addShoppingItemsInProject(projectId, items = []) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => normalizeShoppingItemText(item))
        .filter(Boolean)
        .map((item) => item.toLowerCase()),
    ),
  )

  if (!normalized.length) {
    return []
  }

  const originalByKey = new Map()
  ;(Array.isArray(items) ? items : []).forEach((item) => {
    const text = normalizeShoppingItemText(item)
    if (!text) {
      return
    }

    const key = text.toLowerCase()
    if (!originalByKey.has(key)) {
      originalByKey.set(key, text)
    }
  })

  const tx = db.transaction(() => {
    normalized.forEach((key) => {
      const existing = db
        .prepare('SELECT id FROM shopping_list_items WHERE project_id = ? AND normalized_text = ? LIMIT 1')
        .get(projectId, key)

      const nextSortIndex = getNextShoppingSortIndex(projectId)
      const text = originalByKey.get(key) || key

      if (existing) {
        db
          .prepare(
            `UPDATE shopping_list_items
             SET text = ?, is_checked = 0, sort_index = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .run(text, nextSortIndex, existing.id)
        return
      }

      db
        .prepare(
          `INSERT INTO shopping_list_items (project_id, text, normalized_text, is_checked, sort_index)
           VALUES (?, ?, ?, 0, ?)`,
        )
        .run(projectId, text, key, nextSortIndex)
    })
  })

  tx()

  return getShoppingListItemsByProject(projectId)
}

export function updateShoppingItemCheckedInProject({ id, projectId, checked }) {
  const existing = getShoppingItemByIdInProject(id, projectId)
  if (!existing) {
    return null
  }

  const checkedValue = checked ? 1 : 0
  const nextSortIndex = checked ? getNextShoppingSortIndex(projectId) : existing.sortIndex

  db
    .prepare(
      `UPDATE shopping_list_items
       SET is_checked = ?, sort_index = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND project_id = ?`,
    )
    .run(checkedValue, nextSortIndex, id, projectId)

  const updated = getShoppingItemByIdInProject(id, projectId)
  return {
    ...updated,
    isChecked: Boolean(updated?.isChecked),
  }
}

export function clearShoppingListInProject(projectId) {
  const result = db
    .prepare('DELETE FROM shopping_list_items WHERE project_id = ?')
    .run(projectId)

  return Number(result.changes || 0)
}

export function getSavedRecipesByUser(userId) {
  return db
    .prepare(
      `SELECT
        id,
        user_id AS userId,
        title,
        link,
        notes,
        is_tried AS isTried,
        tried_at AS triedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM saved_recipes
       WHERE user_id = ?
       ORDER BY id DESC`,
    )
    .all(userId)
}

export function createSavedRecipeByUser({ userId, title, link = '', notes = '' }) {
  const normalizedTitle = String(title || '').trim()
  const normalizedLink = String(link || '').trim()
  const normalizedNotes = String(notes || '').trim()

  if (!normalizedTitle) {
    throw new Error('Назва рецепта обовʼязкова')
  }

  const result = db
    .prepare(
      `INSERT INTO saved_recipes (user_id, title, link, notes, is_tried, tried_at)
       VALUES (?, ?, ?, ?, 0, NULL)`,
    )
    .run(userId, normalizedTitle, normalizedLink, normalizedNotes)

  return db
    .prepare(
      `SELECT
        id,
        user_id AS userId,
        title,
        link,
        notes,
        is_tried AS isTried,
        tried_at AS triedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM saved_recipes
       WHERE id = ?`,
    )
    .get(Number(result.lastInsertRowid))
}

export function updateSavedRecipeByUser({ id, userId, title, link = '', notes = '' }) {
  const normalizedTitle = String(title || '').trim()
  const normalizedLink = String(link || '').trim()
  const normalizedNotes = String(notes || '').trim()

  if (!normalizedTitle) {
    throw new Error('Назва рецепта обовʼязкова')
  }

  const result = db
    .prepare(
      `UPDATE saved_recipes
       SET title = ?, link = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
    )
    .run(normalizedTitle, normalizedLink, normalizedNotes, id, userId)

  if (result.changes < 1) {
    return null
  }

  return db
    .prepare(
      `SELECT
        id,
        user_id AS userId,
        title,
        link,
        notes,
        is_tried AS isTried,
        tried_at AS triedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM saved_recipes
       WHERE id = ? AND user_id = ?`,
    )
    .get(id, userId)
}

export function setSavedRecipeTriedByUser({ id, userId, isTried }) {
  const normalizedTried = Boolean(isTried)

  const result = db
    .prepare(
      `UPDATE saved_recipes
       SET is_tried = ?,
           tried_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
    )
    .run(normalizedTried ? 1 : 0, normalizedTried ? 1 : 0, id, userId)

  if (result.changes < 1) {
    return null
  }

  return db
    .prepare(
      `SELECT
        id,
        user_id AS userId,
        title,
        link,
        notes,
        is_tried AS isTried,
        tried_at AS triedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM saved_recipes
       WHERE id = ? AND user_id = ?`,
    )
    .get(id, userId)
}

export function deleteSavedRecipeByUser({ id, userId }) {
  const result = db
    .prepare('DELETE FROM saved_recipes WHERE id = ? AND user_id = ?')
    .run(id, userId)

  return result.changes > 0
}

export function getDashboardStatsForMonth({ projectId, userId, monthPrefix }) {
  const normalizedMonthPrefix = String(monthPrefix || '').trim()

  const dishesRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM dishes
       WHERE project_id = ?
         AND SUBSTR(created_at, 1, 7) = ?`,
    )
    .get(projectId, normalizedMonthPrefix)

  const recipesRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM saved_recipes
       WHERE user_id = ?
         AND SUBSTR(created_at, 1, 7) = ?`,
    )
    .get(userId, normalizedMonthPrefix)

  const completedShoppingRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM shopping_list_items
       WHERE project_id = ?
         AND is_checked = 1
         AND SUBSTR(updated_at, 1, 7) = ?`,
    )
    .get(projectId, normalizedMonthPrefix)

  return {
    newDishesCount: Number(dishesRow?.count || 0),
    newSavedRecipesCount: Number(recipesRow?.count || 0),
    completedPurchasesCount: Number(completedShoppingRow?.count || 0),
  }
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

export function getFavoriteDishIdsForUserInProject(userId, projectId) {
  const rows = db
    .prepare(
      `SELECT dish_id AS dishId
       FROM user_favorites
       WHERE user_id = ? AND project_id = ?
       ORDER BY id DESC`,
    )
    .all(userId, projectId)

  return rows.map((row) => Number(row.dishId))
}

export function addFavoriteDishForUser(userId, dishId) {
  const result = db
    .prepare('INSERT OR IGNORE INTO user_favorites (user_id, dish_id) VALUES (?, ?)')
    .run(userId, dishId)

  return result.changes > 0
}

export function addFavoriteDishForUserInProject(userId, dishId, projectId) {
  const result = db
    .prepare('INSERT OR IGNORE INTO user_favorites (user_id, dish_id, project_id) VALUES (?, ?, ?)')
    .run(userId, dishId, projectId)

  return result.changes > 0
}

export function removeFavoriteDishForUser(userId, dishId) {
  const result = db
    .prepare('DELETE FROM user_favorites WHERE user_id = ? AND dish_id = ?')
    .run(userId, dishId)

  return result.changes > 0
}

export function removeFavoriteDishForUserInProject(userId, dishId, projectId) {
  const result = db
    .prepare('DELETE FROM user_favorites WHERE user_id = ? AND dish_id = ? AND project_id = ?')
    .run(userId, dishId, projectId)

  return result.changes > 0
}

export function getProjectsForUser(userId) {
  return db
    .prepare(
      `SELECT
        p.id,
        p.name,
        p.notes,
        m.role,
        m.permissions_role AS permissionsRole,
        p.created_at AS createdAt
       FROM project_memberships m
       JOIN projects p ON p.id = m.project_id
       WHERE m.user_id = ?
       ORDER BY p.id ASC`,
    )
    .all(userId)
}

export function getProjectById(projectId) {
  return db
    .prepare(
      `SELECT
        p.id,
        p.name,
        p.notes,
        p.created_by_user_id AS createdByUserId,
        p.created_at AS createdAt
       FROM projects p
       WHERE p.id = ?`,
    )
    .get(projectId)
}

export function createProject({ name, notes = '', createdByUserId }) {
  const normalizedName = normalizeProjectName(name)
  const normalizedNotes = normalizeProjectNotes(notes)

  const result = db
    .prepare('INSERT INTO projects (name, notes, created_by_user_id) VALUES (?, ?, ?)')
    .run(normalizedName, normalizedNotes, createdByUserId || null)

  const projectId = Number(result.lastInsertRowid)

  db.prepare('INSERT OR IGNORE INTO project_memberships (user_id, project_id, role, permissions_role) VALUES (?, ?, ?, ?)')
    .run(createdByUserId, projectId, 'OWNER', 'EDITOR')

  db.prepare('UPDATE users SET current_project_id = ? WHERE id = ?')
    .run(projectId, createdByUserId)

  return getProjectById(projectId)
}

export function updateProjectById({ projectId, name, notes = '' }) {
  const normalizedName = normalizeProjectName(name)
  const normalizedNotes = normalizeProjectNotes(notes)

  if (!normalizedName) {
    throw new Error('Назва дошки обовʼязкова')
  }

  const result = db
    .prepare(
      `UPDATE projects
       SET name = ?, notes = ?
       WHERE id = ?`,
    )
    .run(normalizedName, normalizedNotes, projectId)

  if (result.changes < 1) {
    return null
  }

  return getProjectById(projectId)
}

export function deleteProjectById(projectId) {
  const result = db
    .prepare('DELETE FROM projects WHERE id = ?')
    .run(projectId)

  return result.changes > 0
}

export function addProjectMembership({ userId, projectId, role = 'MEMBER' }) {
  const normalizedRole = String(role || '').toUpperCase() === 'OWNER' ? 'OWNER' : 'MEMBER'
  const permissionsRole = normalizedRole === 'OWNER' ? 'EDITOR' : 'MEMBER'

  const result = db
    .prepare('INSERT OR IGNORE INTO project_memberships (user_id, project_id, role, permissions_role) VALUES (?, ?, ?, ?)')
    .run(userId, projectId, normalizedRole, permissionsRole)

  db.prepare(
    `UPDATE users
     SET current_project_id = COALESCE(current_project_id, ?)
     WHERE id = ?`,
  ).run(projectId, userId)

  return result.changes > 0
}

export function isUserInProject(userId, projectId) {
  const row = db
    .prepare('SELECT id FROM project_memberships WHERE user_id = ? AND project_id = ? LIMIT 1')
    .get(userId, projectId)

  return Boolean(row)
}

export function getProjectRoleForUser(userId, projectId) {
  const row = db
    .prepare('SELECT role FROM project_memberships WHERE user_id = ? AND project_id = ? LIMIT 1')
    .get(userId, projectId)

  return row?.role || null
}

export function getProjectPermissionsRoleForUser(userId, projectId) {
  const row = db
    .prepare('SELECT permissions_role AS permissionsRole FROM project_memberships WHERE user_id = ? AND project_id = ? LIMIT 1')
    .get(userId, projectId)

  return String(row?.permissionsRole || 'MEMBER').toUpperCase()
}

export function updateProjectMemberPermissionsRole({ userId, projectId, permissionsRole }) {
  const normalized = String(permissionsRole || '').toUpperCase() === 'EDITOR' ? 'EDITOR' : 'MEMBER'

  const membership = db
    .prepare('SELECT role FROM project_memberships WHERE user_id = ? AND project_id = ? LIMIT 1')
    .get(userId, projectId)

  if (!membership) {
    return null
  }

  if (membership.role === 'OWNER') {
    return {
      userId,
      projectId,
      role: membership.role,
      permissionsRole: 'EDITOR',
    }
  }

  db
    .prepare(
      `UPDATE project_memberships
       SET permissions_role = ?
       WHERE user_id = ? AND project_id = ?`,
    )
    .run(normalized, userId, projectId)

  return db
    .prepare(
      `SELECT
        user_id AS userId,
        project_id AS projectId,
        role,
        permissions_role AS permissionsRole
       FROM project_memberships
       WHERE user_id = ? AND project_id = ?`,
    )
    .get(userId, projectId)
}

export function setCurrentProjectForUser(userId, projectId) {
  db.prepare('UPDATE users SET current_project_id = ? WHERE id = ?').run(projectId, userId)
  return getUserById(userId)
}

export function countProjectMembers(projectId) {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM project_memberships WHERE project_id = ?')
    .get(projectId)

  return Number(row?.count || 0)
}

export function getProjectMembers(projectId) {
  return db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.display_name AS displayName,
        u.avatar_url AS avatarUrl,
        u.current_project_id AS currentProjectId,
        m.role,
        m.permissions_role AS permissionsRole,
        m.created_at AS joinedAt
       FROM project_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.project_id = ?
       ORDER BY
         CASE WHEN m.role = 'OWNER' THEN 0 ELSE 1 END,
         u.display_name COLLATE NOCASE ASC,
         u.email COLLATE NOCASE ASC`,
    )
    .all(projectId)
}

export function removeProjectMembership(userId, projectId) {
  const tx = db.transaction(() => {
    const membership = db
      .prepare(
        `SELECT
          m.role,
          u.current_project_id AS currentProjectId
         FROM project_memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.user_id = ? AND m.project_id = ?
         LIMIT 1`,
      )
      .get(userId, projectId)

    if (!membership) {
      return { removed: false, reason: 'NOT_FOUND' }
    }

    if (membership.role === 'OWNER') {
      const ownerCountRow = db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM project_memberships
           WHERE project_id = ? AND role = 'OWNER'`,
        )
        .get(projectId)

      const ownerCount = Number(ownerCountRow?.count || 0)
      if (ownerCount <= 1) {
        return { removed: false, reason: 'LAST_OWNER' }
      }
    }

    const deleteResult = db
      .prepare('DELETE FROM project_memberships WHERE user_id = ? AND project_id = ?')
      .run(userId, projectId)

    if (deleteResult.changes === 0) {
      return { removed: false, reason: 'NOT_FOUND' }
    }

    if (Number(membership.currentProjectId) === Number(projectId)) {
      const nextMembership = db
        .prepare(
          `SELECT project_id AS projectId
           FROM project_memberships
           WHERE user_id = ?
           ORDER BY project_id ASC
           LIMIT 1`,
        )
        .get(userId)

      db.prepare('UPDATE users SET current_project_id = ? WHERE id = ?')
        .run(nextMembership?.projectId || null, userId)
    }

    return { removed: true }
  })

  return tx()
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
        current_project_id AS currentProjectId,
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
        current_project_id AS currentProjectId,
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

export function createActivityLog({ actorUserId, actorEmail, action, message, projectId, details = {} }) {
  const resolvedProjectId = resolveActivityLogProjectId(actorUserId, projectId ?? details?.projectId)

  if (!Number.isInteger(resolvedProjectId) || resolvedProjectId < 1) {
    return null
  }

  const normalizedDetails = normalizeActivityDetails(details)
  const detailsWithProject = {
    ...normalizedDetails,
    projectId: resolvedProjectId,
  }

  const result = db
    .prepare(
      'INSERT INTO activity_logs (actor_user_id, actor_email, action, message, project_id, details_json) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(actorUserId, actorEmail, action, message, resolvedProjectId, JSON.stringify(detailsWithProject))

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

export function getRecentActivityLogsForUserInProject(userId, projectId, limit = 50) {
  return getActivityLogRowsForUser(userId, limit, projectId)
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

export function getUnreadActivityLogsCountForUserInProject(userId, projectId) {
  const normalizedProjectId = Number(projectId)

  if (!Number.isInteger(normalizedProjectId) || normalizedProjectId < 1) {
    return 0
  }

  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM activity_logs l
       LEFT JOIN activity_log_reads r
         ON r.activity_log_id = l.id
        AND r.user_id = ?
       WHERE l.actor_user_id != ?
         AND l.project_id = ?
         AND r.activity_log_id IS NULL`,
    )
    .get(userId, userId, normalizedProjectId)

  return Number(row?.count || 0)
}
