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

export default function TopMenu({ mealCategories, typeCategories }) {
  return (
    <header className="top-menu">
      <div className="menu-actions">
        <NavLink to="/add-category" className={linkClass}>
          + Додати категорію
        </NavLink>
        <NavLink to="/add-dish" className={linkClass}>
          + Додати страву
        </NavLink>
      </div>
      <MenuGroup title="За часом дня" categories={mealCategories} />
      <MenuGroup title="За видом страв" categories={typeCategories} />
    </header>
  )
}
