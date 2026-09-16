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
import { BookManagement } from "../features/admin/BookManagement";
import { LiveLearningPage } from "../features/learning/LiveLearningPage";
import { LiveExplorePage } from "../features/explore/LiveExplorePage";
import { CirculationPage } from "../features/circulation/CirculationPage";
import { supabase } from "../lib/supabase";
export function App() {
  return (<AccountProvider><DemoProvider>
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/reset-password" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/learning" replace />} />
        <Route path="/learning" element={supabase ? <LiveLearningPage /> : <MyLearningPage />} />
        <Route path="/library" element={supabase ? <LiveLibraryPage /> : <LibraryPage />} />
        <Route path="/explore" element={supabase ? <LiveExplorePage /> : <ExplorePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/admin" element={supabase ? <BookManagement /> : <AdminPage />} />
        <Route path="/admin/circulation" element={supabase ? <CirculationPage /> : <AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/learning" replace />} />
    </Routes>
  </DemoProvider></AccountProvider>);
}
