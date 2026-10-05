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
import { HomePage, QuickGuidePage } from "../features/home/HomePage";
import { NotFoundPage } from "./NotFoundPage";
import { RouteMeta } from "./RouteMeta";

const AdminPage = lazy(() => import("../features/admin/AdminPage").then(module => ({ default: module.AdminPage })));
const AdministratorDashboard = lazy(() => import("../features/admin/AdministratorDashboard").then(module => ({ default: module.AdministratorDashboard })));
const BookManagement = lazy(() => import("../features/admin/BookManagement").then(module => ({ default: module.BookManagement })));
const StaffPage = lazy(() => import("../features/admin/StaffPage").then(module => ({ default: module.StaffPage })));
const CirculationPage = lazy(() => import("../features/circulation/CirculationPage").then(module => ({ default: module.CirculationPage })));
const CommunityPage = lazy(() => import("../features/community/CommunityPage").then(module => ({ default: module.CommunityPage })));
const StaffTrainingPage = lazy(() => import("../features/community/StaffTrainingPage").then(module => ({ default: module.StaffTrainingPage })));

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
    <RouteMeta />
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/reset-password" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/start" element={<QuickGuidePage />} />
        <Route path="/learning" element={supabase ? <LiveLearningPage /> : <MyLearningPage />} />
        <Route path="/library" element={supabase ? <LiveLibraryPage /> : <LibraryPage />} />
        {supabase && <Route path="/library/:bookId" element={<BookDetailPage />} />}
        <Route path="/explore" element={supabase ? <LiveExplorePage /> : <ExplorePage />} />
        <Route path="/community" element={<LazyPage><CommunityPage /></LazyPage>} />
        <Route path="/staff/training" element={<RequireStaff><LazyPage><StaffTrainingPage /></LazyPage></RequireStaff>} />
        <Route path="/staff" element={<RequireStaff allowDemo={false}><LazyPage><StaffPage /></LazyPage></RequireStaff>} />
        <Route path="/staff/catalogue" element={<RequireStaff><LazyPage>{supabase ? <BookManagement /> : <AdminPage />}</LazyPage></RequireStaff>} />
        <Route path="/staff/circulation" element={<RequireStaff><LazyPage>{supabase ? <CirculationPage /> : <AdminPage />}</LazyPage></RequireStaff>} />
        <Route path="/admin/settings" element={<RequireAuth><LazyPage><AdministratorDashboard /></LazyPage></RequireAuth>} />
        <Route path="/admin" element={<RequireStaff>{supabase ? <LegacyAdminRoute /> : <AdminPage />}</RequireStaff>} />
        <Route path="/admin/circulation" element={<RequireStaff><Navigate to="/staff/circulation" replace /></RequireStaff>} />
        <Route path="/design-preview/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </DemoProvider></AccountProvider>);
}
