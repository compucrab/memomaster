import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../styles/layout.css";

function Layout() {
  return (
    <div class="app-layout">
      <Sidebar />
      <main class="app-main">
        <Topbar />
        <section class="workspace">
          <div class="workspace-placeholder">
            <h1>Your learning space</h1>
            <p>Your notebooks and study activity will appear here.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Layout;