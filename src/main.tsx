// JVee Crunch Kitchen website
// Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import "./styles/index.css";
import { MenuProvider } from "./lib/menu";
import { CartProvider } from "./lib/cart";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";

// The staff admin loads separately, so customers never download it
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const loading = <p style={{ padding: 40, textAlign: "center", color: "#4d7563" }}>Loading…</p>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/menu", element: <Menu /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/order/:token", element: <OrderStatus /> },
      { path: "/basket", element: <ComingSoon milestone={4} title="Custom baskets" detail="The enquiry form for birthdays, weddings and thank-you baskets. Until then, call or WhatsApp 0805 892 3302." /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    // Staff admin has its own frame, without the shop header and footer
    path: "/admin",
    element: <Suspense fallback={loading}><AdminApp /></Suspense>,
    children: [
      { index: true, element: <AdminOrders /> },
      { path: "products", element: <AdminProducts /> },
      { path: "settings", element: <AdminSettings /> },
      { path: "*", element: <Navigate to="/admin" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MenuProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </MenuProvider>
  </StrictMode>,
);
