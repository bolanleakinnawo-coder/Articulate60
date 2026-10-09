import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "../Pages/Landing";
import AppLayout from "../Components/layout/AppLayout";
import Home from "../Pages/Home";
import Practice from "../Pages/Practice";
import Challenges from "../Pages/Challenges";
import Learn from "../Pages/Learn";
import Library from "../Pages/Library";
import Profile from "../Pages/Profile";
import AdminTestimonials from "../Pages/AdminTestimonials";
import AdminOverview from "../Pages/AdminOverview";
import AdminSubscribers from "../Pages/AdminSubscribers";
import AdminLayout from "../Components/layout/AdminLayout";
import Registration from "../Pages/Registration";
import Login from "../Pages/Login";
import ProtectedRoute from "./ProtectedRoute";

import PracticeSession from "../Pages/PracticeSession";
import WelcomeIntro from "../Pages/WelcomeIntro"; // NEW
import ReadyIntro from "../Pages/ReadyIntro"; // NEW

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landingpage" element={<Landing />} />
      <Route path="/welcome" element={<WelcomeIntro />} /> {/* NEW */}
      <Route path="/register" element={<Registration />} />
      <Route path="/ready" element={<ReadyIntro />} /> {/* NEW */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="practice" element={<Practice />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="library" element={<Library />} />
          <Route path="profile" element={<Profile />} />
          <Route path="learn" element={<Learn />} />

          <Route path="practice/prepare" element={<PracticeSession />} />
          <Route path="practice/yap-session" element={<PracticeSession />} />
        </Route>
      </Route>
    </Routes>
  );
}
