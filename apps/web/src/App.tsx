import { Outlet, NavLink } from "react-router-dom";
export default function App() {
  return (
    <div className="app">
      <header className="header">
        <nav className="nav">
          <NavLink to="/" className="brand">
            Q2
          </NavLink>
          <NavLink to="/translate">Translate</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">Prototype • Step 0</footer>
    </div>
  );
}
