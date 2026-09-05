import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AdminPage } from "../features/admin/AdminPage";
import { SignInPage } from "../features/auth/SignInPage";
import { CommunityPage } from "../features/community/CommunityPage";
import { ExplorePage } from "../features/explore/ExplorePage";
import { MyLearningPage } from "../features/learning/MyLearningPage";

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/learning" replace />} />
        <Route path="/learning" element={<MyLearningPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/learning" replace />} />
    </Routes>
  );
}
