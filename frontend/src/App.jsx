import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import Auth from "./pages/Auth.jsx";
import Account from "./pages/Account.jsx";
import AdminApp from "./admin/AdminApp.jsx";

export default function App() {
  const { pathname } = useLocation();

  // The admin panel has its own layout, without the shop menu and footer
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<p className="container empty">Page not found.</p>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
