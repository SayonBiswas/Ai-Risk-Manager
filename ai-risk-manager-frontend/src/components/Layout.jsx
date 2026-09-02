import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ title, children }) => {
  return (
    <div className="min-h-screen bg-[#13131b]">
      <Sidebar />
      <Header title={title} />
      <main className="ml-[260px] mt-[64px] p-6 min-h-screen bg-[#13131b]">
        {children}
      </main>
    </div>
  );
};

export default Layout;