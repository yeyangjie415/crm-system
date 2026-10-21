import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { CustomerProvider } from '@/hooks/useCustomers'
import { ContractProvider } from '@/hooks/useContracts'
import { VisitProvider } from '@/hooks/useVisits'
import { ExpenseProvider } from '@/hooks/useExpenses'
import { TaskProvider } from '@/hooks/useTasks'
import { NotificationProvider } from '@/hooks/useNotifications'
import { UserProvider } from '@/hooks/useUsers'
import { PermissionConfigProvider } from '@/hooks/usePermissionConfig'
import { AuditLogProvider } from '@/hooks/useAuditLog'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import LoadingSkeleton from '@/components/common/LoadingSkeleton'
import NotFoundPage from '@/pages/NotFoundPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CustomerListPage = lazy(() => import('@/pages/CustomerListPage'))
const CustomerDetailPage = lazy(() => import('@/pages/CustomerDetailPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'))
const AuditLogDetailPage = lazy(() => import('@/pages/AuditLogDetailPage'))
const DealsPage = lazy(() => import('@/pages/DealsPage'))
const DealDetailPage = lazy(() => import('@/pages/DealDetailPage'))
const CommissionPage = lazy(() => import('@/pages/CommissionPage'))
const ExpensePage = lazy(() => import('@/pages/ExpensePage'))
const VisitsPage = lazy(() => import('@/pages/VisitsPage'))
const OfficePage = lazy(() => import('@/pages/OfficePage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

function LazyLoad({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-5"><LoadingSkeleton /></div>}>
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, sessionReady } = useAuth()
  // Wait until a restored session has been validated against the backend,
  // otherwise an expired token would render a "logged in" but dataless app.
  if (!sessionReady) return <div className="p-5"><LoadingSkeleton /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LazyLoad><DashboardPage /></LazyLoad>} />
        <Route path="customers" element={<LazyLoad><CustomerListPage /></LazyLoad>} />
        <Route path="customers/:id" element={<LazyLoad><CustomerDetailPage /></LazyLoad>} />
        <Route path="deals" element={<LazyLoad><DealsPage /></LazyLoad>} />
        <Route path="deals/:id" element={<LazyLoad><DealDetailPage /></LazyLoad>} />
        <Route path="commissions" element={<LazyLoad><CommissionPage /></LazyLoad>} />
        <Route path="expenses" element={<LazyLoad><ExpensePage /></LazyLoad>} />
        <Route path="visits" element={<LazyLoad><VisitsPage /></LazyLoad>} />
        <Route path="office" element={<LazyLoad><OfficePage /></LazyLoad>} />
        <Route path="reports" element={<LazyLoad><ReportsPage /></LazyLoad>} />
        <Route path="settings" element={<LazyLoad><AdminRoute><SettingsPage /></AdminRoute></LazyLoad>} />
        <Route path="settings/audit-log" element={<LazyLoad><SuperAdminRoute><AuditLogPage /></SuperAdminRoute></LazyLoad>} />
        <Route path="settings/audit-log/:userId" element={<LazyLoad><SuperAdminRoute><AuditLogDetailPage /></SuperAdminRoute></LazyLoad>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AuditLogProvider>
        <PermissionConfigProvider>
          <AuthProvider>
            <CustomerProvider>
              <NotificationProvider>
                <TaskProvider>
                  <VisitProvider>
                    <ExpenseProvider>
                      <ContractProvider>
                <AppRoutes />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    },
                  }}
                />
                      </ContractProvider>
                    </ExpenseProvider>
                  </VisitProvider>
                </TaskProvider>
              </NotificationProvider>
            </CustomerProvider>
          </AuthProvider>
        </PermissionConfigProvider>
      </AuditLogProvider>
    </UserProvider>
  )
}
