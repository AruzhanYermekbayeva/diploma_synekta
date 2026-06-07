import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Landing from "./pages/landing"
import Register from "./pages/register"
import Login from "./pages/login"
import Dashboard from "./pages/dashboard"
import Discover from "./pages/discover"
import ManageEntity from "./pages/manageEntity"
import TalentProfile from "./pages/talentProfile"
import { Navbar } from "./components/Navbar"
import { AppLayout } from "./layout"
const router = createBrowserRouter([
{
    path: "/",
    element: <Landing />,
  },
  {
    path: "/register",
    element: <Register />,
  },
{
    path: "/login",
    element: <Login />,
  },
  {
    element: <AppLayout />, // This wraps all children below
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
  path: "/talent-profile",
  element: <TalentProfile />,
},
      {
        path: "/discover",
        element: <Discover />,
      },
      { 
        path: "/manage/:id", 
        element: <ManageEntity /> 
      },
    ],
  },
]);

export default function App() {
  return (
    <RouterProvider router={router} />
  )
}