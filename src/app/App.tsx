import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AdminPage } from "../features/admin/AdminPage";
import { SignInPage } from "../features/auth/SignInPage";
import { CommunityPage } from "../features/community/CommunityPage";
import { ExplorePage } from "../features/explore/ExplorePage";
import { MyLearningPage } from "../features/learning/MyLearningPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { DemoProvider } from "../demo/DemoProvider";
import { AccountProvider } from "../features/auth/AccountProvider";
import { LiveLibraryPage } from "../features/library/LiveLibraryPage";
import { BookDetailPage } from "../features/library/BookDetailPage";
import { BookManagement } from "../features/admin/BookManagement";
import { LiveLearningPage } from "../features/learning/LiveLearningPage";
import { LiveExplorePage } from "../features/explore/LiveExplorePage";
import { CirculationPage } from "../features/circulation/CirculationPage";
import { RequireAuth, RequireStaff } from "../features/auth/RequireStaff";
import { AdministratorDashboard } from "../features/admin/AdministratorDashboard";
import { useAccount } from "../features/auth/context";
import { supabase } from "../lib/supabase";

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
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/staff" element={<RequireStaff><Navigate to="/staff/catalogue" replace /></RequireStaff>} />
        <Route path="/staff/catalogue" element={<RequireStaff>{supabase ? <BookManagement /> : <AdminPage />}</RequireStaff>} />
        <Route path="/staff/circulation" element={<RequireStaff>{supabase ? <CirculationPage /> : <AdminPage />}</RequireStaff>} />
        <Route path="/admin/settings" element={<RequireAuth><AdministratorDashboard /></RequireAuth>} />
        <Route path="/admin" element={<RequireStaff>{supabase ? <LegacyAdminRoute /> : <AdminPage />}</RequireStaff>} />
        <Route path="/admin/circulation" element={<RequireStaff><Navigate to="/staff/circulation" replace /></RequireStaff>} />
      </Route>
      <Route path="*" element={<Navigate to="/learning" replace />} />
    </Routes>
  </DemoProvider></AccountProvider>);
}
