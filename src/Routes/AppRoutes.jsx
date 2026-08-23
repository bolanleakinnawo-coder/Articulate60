import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "../Pages/Landing";
import AppLayout from "../Components/layout/AppLayout";
import Home from "../Pages/Home";
import Practice from "../Pages/Practice";
import Challenges from "../Pages/Challenges";
import Library from "../Pages/Library";
import Profile from "../Pages/Profile";
import Registration from "../Pages/Registration";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landingpage" element={<Landing />} />
      <Route path="/register" element={<Registration />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="practice" element={<Practice />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="library" element={<Library />} />
        <Route path="profile" element={<Profile />} />
        <Route path="register" element={<Registration />} />
       
      </Route>
    </Routes>
  );
}
