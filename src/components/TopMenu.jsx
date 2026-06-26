import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  isActive ? 'menu-link menu-link--active' : 'menu-link'

function MenuGroup({ title, categories }) {
  return (
    <div className="menu-group">
      <p className="menu-group-title">{title}</p>
      <div className="menu-scroll">
        {categories.map((category) => (
          <NavLink
            key={category.id}
            to={`/category/${category.id}`}
            className={linkClass}
          >
            {category.name}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function TopMenu({
  mealCategories,
  typeCategories,
  currentUser,
  isAdmin,
  onLogout,
}) {
  return (
    <header className="top-menu">
      <div className="menu-actions">
        {isAdmin ? (
          <>
            <NavLink to="/add-category" className={linkClass}>
              + Додати категорію
            </NavLink>
            <NavLink to="/add-dish" className={linkClass}>
              + Додати страву
            </NavLink>
          </>
        ) : null}

        {currentUser ? (
          <>
            <NavLink to="/profile" className={linkClass}>
              <span className="menu-profile-link">
                <img
                  src={currentUser.avatarUrl || '/avatar-placeholder.svg'}
                  alt="Аватар"
                  className="menu-avatar"
                />
                Профіль
              </span>
            </NavLink>
            <button type="button" className="menu-link menu-link--button" onClick={onLogout}>
              Вийти ({currentUser.role === 'ADMIN' ? 'admin' : 'user'})
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>
              Увійти
            </NavLink>
            <NavLink to="/register" className={linkClass}>
              Реєстрація
            </NavLink>
          </>
        )}
      </div>
      <MenuGroup title="За часом дня" categories={mealCategories} />
      <MenuGroup title="За видом страв" categories={typeCategories} />
    </header>
  )
}
