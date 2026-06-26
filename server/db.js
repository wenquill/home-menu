import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'data.sqlite')

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

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

export function initializeDatabase() {
  db.exec(`
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
      meal_category_id INTEGER NOT NULL,
      type_category_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meal_category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (type_category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_categories_kind ON categories(kind);
    CREATE INDEX IF NOT EXISTS idx_dishes_meal_category ON dishes(meal_category_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_type_category ON dishes(type_category_id);
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
    return db
      .prepare(
        `SELECT
          d.id,
          d.title,
          d.description,
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
  }

  return db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
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
}

export function createDish({ title, description, mealCategoryId, typeCategoryId }) {
  const result = db
    .prepare(
      `INSERT INTO dishes (title, description, meal_category_id, type_category_id)
       VALUES (?, ?, ?, ?)`,
    )
    .run(title, description, mealCategoryId, typeCategoryId)

  return db
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.description,
        d.meal_category_id AS mealCategoryId,
        d.type_category_id AS typeCategoryId,
        meal.name AS mealCategoryName,
        type.name AS typeCategoryName
       FROM dishes d
       JOIN categories meal ON meal.id = d.meal_category_id
       JOIN categories type ON type.id = d.type_category_id
       WHERE d.id = ?`,
    )
    .get(result.lastInsertRowid)
}

export function getCategoryById(id) {
  return db.prepare('SELECT id, name, kind FROM categories WHERE id = ?').get(id)
}
