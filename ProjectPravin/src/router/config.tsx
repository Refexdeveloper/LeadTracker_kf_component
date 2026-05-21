import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "../pages/NotFound";
import DashboardPage from "../pages/dashboard/page";
import PMDashboardPage from "../pages/pm-dashboard/page";
import EmployeeDashboardPage from "../pages/employee-dashboard/page";
import ProjectsPage from "../pages/projects/page";
import TasksPage from "../pages/tasks/page";
import ReportsPage from "../pages/reports/page";
import HelpPage from "../pages/help/page";

const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/pm-dashboard", element: <PMDashboardPage /> },
  { path: "/employee-dashboard", element: <EmployeeDashboardPage /> },
  { path: "/projects", element: <ProjectsPage /> },
  { path: "/tasks", element: <TasksPage /> },
  { path: "/reports", element: <ReportsPage /> },
  { path: "/help", element: <HelpPage /> },
  { path: "*", element: <NotFound /> },
];

export default routes;
