// JVee Crunch Kitchen website
// Developer: JVeesoft-IT Solutions and Services Ltd (JVeesoft-IT)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./styles/index.css";
import { MenuProvider } from "./lib/menu";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/menu", element: <Menu /> },
      { path: "/checkout", element: <ComingSoon milestone={2} title="Cart and checkout" detail="The cart, delivery or pickup choice and checkout arrive in the next update." /> },
      { path: "/order/:token", element: <ComingSoon milestone={2} title="Order status" detail="Customers will follow their order here after checkout." /> },
      { path: "/basket", element: <ComingSoon milestone={4} title="Custom baskets" detail="The enquiry form for birthdays, weddings and thank-you baskets. Until then, call or WhatsApp 0805 892 3302." /> },
      { path: "/admin/*", element: <ComingSoon milestone={3} title="Staff admin" detail="Sign in, the live orders board, products and settings." /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MenuProvider>
      <RouterProvider router={router} />
    </MenuProvider>
  </StrictMode>,
);
