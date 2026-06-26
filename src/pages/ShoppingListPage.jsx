import { useEffect, useMemo, useState } from 'react'

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aChecked = a.isChecked ? 1 : 0
    const bChecked = b.isChecked ? 1 : 0

    if (aChecked !== bChecked) {
      return aChecked - bChecked
    }

    const aSort = Number(a.sortIndex || 0)
    const bSort = Number(b.sortIndex || 0)
    if (aSort !== bSort) {
      return aSort - bSort
    }

    return Number(a.id) - Number(b.id)
  })
}

export default function ShoppingListPage({
  onLoadShoppingList,
  onAddShoppingListItem,
  onUpdateShoppingListItem,
  onClearShoppingList,
}) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [activeToggleId, setActiveToggleId] = useState(null)
  const [newItemText, setNewItemText] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const visibleItems = useMemo(() => sortItems(items), [items])

  const loadItems = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await onLoadShoppingList?.()
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [onLoadShoppingList])

  const addItem = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const text = String(newItemText || '').trim()
    if (!text) {
      setError('Вкажіть назву елемента')
      return
    }

    setIsAdding(true)

    try {
      const created = await onAddShoppingListItem?.(text)
      if (created?.id) {
        setItems((prev) => sortItems([created, ...prev.filter((item) => item.id !== created.id)]))
      } else {
        await loadItems()
      }
      setNewItemText('')
      setMessage('Елемент додано до списку')
    } catch (addError) {
      setError(addError.message)
    } finally {
      setIsAdding(false)
    }
  }

  const toggleItem = async (item) => {
    const itemId = Number(item?.id)
    if (!Number.isInteger(itemId) || itemId < 1) {
      return
    }

    setError('')
    setMessage('')
    setActiveToggleId(itemId)

    try {
      const updated = await onUpdateShoppingListItem?.(itemId, !item.isChecked)
      if (updated?.id) {
        setItems((prev) => sortItems(prev.map((entry) => (entry.id === itemId ? updated : entry))))
      } else {
        await loadItems()
      }
    } catch (toggleError) {
      setError(toggleError.message)
    } finally {
      setActiveToggleId(null)
    }
  }

  const clearList = async () => {
    setError('')
    setMessage('')
    setIsClearing(true)

    try {
      await onClearShoppingList?.()
      setItems([])
      setMessage('Список очищено')
    } catch (clearError) {
      setError(clearError.message)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main className="category-page shopping-page">
      <h1 className="category-title">список покупок</h1>

      <section className="admin-panel" aria-label="Додати елемент до списку покупок">
        <form className="admin-form shopping-add-form" onSubmit={addItem}>
          <div className="shopping-add-row">
            <input
              id="shopping-item-text"
              type="text"
              value={newItemText}
              onChange={(event) => setNewItemText(event.target.value)}
              maxLength={120}
              placeholder="Наприклад: молоко"
            />
            <button type="submit" disabled={isAdding}>
              {isAdding ? 'Додаю...' : 'Додати'}
            </button>
          </div>
        </form>

        {error ? <p className="state-message state-message--error">{error}</p> : null}
        {message ? <p className="state-message">{message}</p> : null}
      </section>

      <section className="admin-panel" aria-label="Елементи списку покупок">
        {isLoading ? <p className="state-message">Завантаження списку...</p> : null}

        {!isLoading && visibleItems.length === 0 ? (
          <p className="state-message">Список порожній. Додайте перший елемент.</p>
        ) : null}

        {!isLoading && visibleItems.length > 0 ? (
          <ul className="shopping-list-items">
            {visibleItems.map((item) => (
              <li key={item.id} className={item.isChecked ? 'shopping-item shopping-item--checked' : 'shopping-item'}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(item.isChecked)}
                    onChange={() => {
                      void toggleItem(item)
                    }}
                    disabled={activeToggleId === item.id}
                  />
                  <span>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="shopping-bottom-actions" aria-label="Дії зі списком покупок">
        <button
          type="button"
          className="shopping-clear-button"
          onClick={() => {
            void clearList()
          }}
          disabled={isClearing || visibleItems.length === 0}
        >
          {isClearing ? 'Очищую...' : 'Очистити список'}
        </button>
      </div>
    </main>
  )
}
