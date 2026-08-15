import { Routes, Route } from "react-router-dom";

import AppLayout from "../Components/Layouts/AppLayout";
import Home from "../Pages/Home";
import Practice from "../Pages/Practice";
import Challenges from "../Pages/Challenges";
import Library from "../Pages/Library";
import Profile from "../Pages/Profile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="practice" element={<Practice />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="library" element={<Library />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
