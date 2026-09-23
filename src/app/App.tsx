import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppShell } from "../components/layout/AppShell";
import { SignInPage } from "../features/auth/SignInPage";
import { ExplorePage } from "../features/explore/ExplorePage";
import { MyLearningPage } from "../features/learning/MyLearningPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { DemoProvider } from "../demo/DemoProvider";
import { AccountProvider } from "../features/auth/AccountProvider";
import { LiveLibraryPage } from "../features/library/LiveLibraryPage";
import { BookDetailPage } from "../features/library/BookDetailPage";
import { LiveLearningPage } from "../features/learning/LiveLearningPage";
import { LiveExplorePage } from "../features/explore/LiveExplorePage";
import { RequireAuth, RequireStaff } from "../features/auth/RequireStaff";
import { useAccount } from "../features/auth/context";
import { supabase } from "../lib/supabase";

const AdminPage = lazy(() => import("../features/admin/AdminPage").then(module => ({ default: module.AdminPage })));
const AdministratorDashboard = lazy(() => import("../features/admin/AdministratorDashboard").then(module => ({ default: module.AdministratorDashboard })));
const BookManagement = lazy(() => import("../features/admin/BookManagement").then(module => ({ default: module.BookManagement })));
const CirculationPage = lazy(() => import("../features/circulation/CirculationPage").then(module => ({ default: module.CirculationPage })));
const CommunityPage = lazy(() => import("../features/community/CommunityPage").then(module => ({ default: module.CommunityPage })));

function RouteLoading() {
  const { t } = useTranslation();
  return <p className="route-loading" role="status">{t('loadingPage')}</p>;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

function LegacyAdminRoute() {
  const { staffRole } = useAccount();
  return <Navigate to={staffRole === 'administrator' ? '/admin/settings' : '/staff/catalogue'} replace />;
}

export function App() {
  return (<AccountProvider><DemoProvider>
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/reset-password" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/learning" replace />} />
        <Route path="/learning" element={supabase ? <LiveLearningPage /> : <MyLearningPage />} />
        <Route path="/library" element={supabase ? <LiveLibraryPage /> : <LibraryPage />} />
        {supabase && <Route path="/library/:bookId" element={<BookDetailPage />} />}
        <Route path="/explore" element={supabase ? <LiveExplorePage /> : <ExplorePage />} />
        <Route path="/community" element={<LazyPage><CommunityPage /></LazyPage>} />
        <Route path="/staff" element={<RequireStaff><Navigate to="/staff/catalogue" replace /></RequireStaff>} />
        <Route path="/staff/catalogue" element={<RequireStaff><LazyPage>{supabase ? <BookManagement /> : <AdminPage />}</LazyPage></RequireStaff>} />
        <Route path="/staff/circulation" element={<RequireStaff><LazyPage>{supabase ? <CirculationPage /> : <AdminPage />}</LazyPage></RequireStaff>} />
        <Route path="/admin/settings" element={<RequireAuth><LazyPage><AdministratorDashboard /></LazyPage></RequireAuth>} />
        <Route path="/admin" element={<RequireStaff>{supabase ? <LegacyAdminRoute /> : <AdminPage />}</RequireStaff>} />
        <Route path="/admin/circulation" element={<RequireStaff><Navigate to="/staff/circulation" replace /></RequireStaff>} />
      </Route>
      <Route path="*" element={<Navigate to="/learning" replace />} />
    </Routes>
  </DemoProvider></AccountProvider>);
}
