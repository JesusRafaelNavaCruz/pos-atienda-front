import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AdminAuthGuard,
  AdminGuestGuard,
  AuthGuard,
  FeatureGuard,
  GuestGuard,
  PermissionGuard,
} from "./components/layout/Guards";

// Layouts y guards
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Páginas de autenticación
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

// Páginas del panel SuperAdmin
import AdminLoginPage from "@/pages/admin/auth/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/dashboard/AdminDashboardPage";
import SuscriptionsPage from "@/pages/admin/suscriptions/SuscriptionsPage";
import TenantsPage from "@/pages/admin/tenants/TenantsPage";

// Páginas de la app
import DashboardPage from "@/pages/dashboard/DashboardPage";
import PosPage from "@/pages/pos/PosPage";
import ProductsPage from "@/pages/inventory/ProductsPage";
import InventoryMovementsPage from "@/pages/inventory/InventoryMovementsPage";
import SalesPage from "@/pages/sales/SalesPage";
import CustomersPage from "@/pages/customers/CustomersPage";
import SuppliersPage from "@/pages/suppliers/SuppliersPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import BarcodesPage from "@/pages/barcodes/BarcodesPage";

// src/App.tsx
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirigir raíz → login */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />

        {/* Rutas de autenticación — solo accesibles sin sesión */}
        <Route element={<GuestGuard />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* Rutas protegidas — requieren sesión activa */}
        <Route element={<AuthGuard />}>
          <Route path="/app" element={<AppLayout />}>
            {/* Dashboard */}
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Terminal POS — todos los roles autenticados */}
            <Route path="pos" element={<PosPage />} />

            {/* Inventario */}
            <Route
              element={<PermissionGuard resource="products" action="read" />}
            >
              <Route
                path="inventory"
                element={<Navigate to="/app/inventory/products" replace />}
              />
              <Route path="inventory/products" element={<ProductsPage />} />
              <Route
                path="inventory/movements"
                element={<InventoryMovementsPage />}
              />
            </Route >

            {/* Ventas */}
            <Route element={<PermissionGuard resource="sales" action="read" />}>
              <Route path="sales" element={<SalesPage />} />
            </Route>

            {/* Clientes — requiere feature 'customers' */}
            <Route
              element={<PermissionGuard resource="customers" action="read" />}
            >
              <Route element={<FeatureGuard feature="customers" />}>
                <Route path="customers" element={<CustomersPage />} />
              </Route>
            </Route>

            {/* Proveedores — requiere feature 'suppliers' */}
            <Route
              element={<PermissionGuard resource="suppliers" action="read" />}
            >
              <Route element={<FeatureGuard feature="suppliers" />}>
                <Route path="suppliers" element={<SuppliersPage />} />
              </Route>
            </Route>

            {/* Códigos de barras */}
            <Route path="barcodes" element={<BarcodesPage />} />

            {/* Reportes */}
            <Route
              element={
                <PermissionGuard resource="reports" action="view_sales" />
              }
            >
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            {/* Configuración — accesible para todos, el contenido se filtra por rol */}
            <Route path="settings" element={<SettingsPage />} />

            {/* Catch-all dentro de /app */}
            <Route
              path="*"
              element={<Navigate to="/app/dashboard" replace />}
            />
          </Route>
        </Route>

        {/* Rutas del panel SuperAdmin — solo accesibles sin sesión de admin */}
        <Route element={<AdminGuestGuard />}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>

        {/* Rutas del panel SuperAdmin — requieren sesión activa de admin */}
        <Route element={<AdminAuthGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="plans" element={<SuscriptionsPage />} />
            <Route path="tenants" element={<TenantsPage />} />

            {/* Catch-all dentro de /admin */}
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        {/* Catch-all global */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
