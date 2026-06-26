import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  isActive ? 'menu-link menu-link--active' : 'menu-link'

const profileLinkClass = ({ isActive }) =>
  isActive
    ? 'menu-link menu-link--active menu-link--profile'
    : 'menu-link menu-link--profile'

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
  showCategoryControls,
  onLogout,
}) {
  return (
    <>
      <header className="top-menu top-menu--strip">
        <div className="menu-actions menu-actions--strip">
        {currentUser ? (
          <>
            <NavLink to="/" className={linkClass}>
              Страви
            </NavLink>
            <button type="button" className="menu-link menu-link--button" onClick={onLogout}>
              вийти
            </button>
            <NavLink to="/profile" className={profileLinkClass}>
              <img
                src={currentUser.avatarUrl || '/avatar-placeholder.svg'}
                alt="Профіль"
                className="menu-avatar"
              />
            </NavLink>
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
      </header>

      {showCategoryControls ? (
        <section className="top-menu top-menu--categories">
          {isAdmin ? (
            <div className="menu-actions menu-actions--categories">
              <NavLink to="/add-category" className={linkClass}>
                + Додати категорію
              </NavLink>
              <NavLink to="/add-dish" className={linkClass}>
                + Додати страву
              </NavLink>
            </div>
          ) : null}

          <MenuGroup title="За часом дня" categories={mealCategories} />
          <MenuGroup title="За видом страв" categories={typeCategories} />
        </section>
      ) : null}
    </>
  )
}
