import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "../Pages/LandingPage";
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
import AdminPayments from "../Pages/AdminPayments";
import AdminProductNotifications from "../Pages/AdminProductNotifications";
import AdminLayout from "../Components/layout/AdminLayout";
import Registration from "../Pages/Registration";
import Login from "../Pages/Login";
import ForgotPassword from "../Pages/ForgotPassword";
import ResetPassword from "../Pages/ResetPassword";
import ProtectedRoute from "./ProtectedRoute";

import PracticeSession from "../Pages/PracticeSession";
import WelcomeIntro from "../Pages/WelcomeIntro"; // NEW
import ReadyIntro from "../Pages/ReadyIntro"; // NEW
import Waitlist from "../Pages/Waitlist";
import Membership from "../Pages/Membership";
import HelpSupport from "../Pages/HelpSupport";
import {
  GroupPracticeIntro,
  GroupPracticeRoom,
  GroupPracticeStart,
  GroupPracticeCall,
  GroupPracticeJoin,
} from "../Pages/GroupPractice";

// The book reader brings in the PDF library, so it only loads when opened.
const BookReader = lazy(() => import("../Pages/BookReader"));

// Signed in on this device? (Storage can be blocked in private mode.)
function hasToken() {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch {
    return false;
  }
}

function VisitorLanding() {
  const signedIn = hasToken();
  return signedIn ? <Navigate to="/app/home" replace /> : <LandingPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Visitors see the landing page; signed-in members go to the app. */}
      <Route path="/" element={<VisitorLanding />} />
      {/* Always shows the landing page, even when signed in (for previews). */}
      <Route path="/landingpage" element={<LandingPage />} />
      <Route path="/welcome" element={<WelcomeIntro />} /> {/* NEW */}
      <Route path="/register" element={<Registration />} />
      <Route path="/ready" element={<ReadyIntro />} /> {/* NEW */}
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route
          path="product-notifications"
          element={<AdminProductNotifications />}
        />
        <Route
          path="waitlist"
          element={<Navigate to="/admin/product-notifications" replace />}
        />
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
          <Route
            path="learn/read/:bookId"
            element={
              <Suspense fallback={null}>
                <BookReader />
              </Suspense>
            }
          />

          <Route path="practice/prepare" element={<PracticeSession />} />
          <Route path="practice/yap-session" element={<PracticeSession />} />
          <Route
            path="practice/research-session"
            element={<PracticeSession />}
          />
          <Route path="membership" element={<Membership />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="group-practice" element={<GroupPracticeIntro />} />
          <Route path="group-practice/room" element={<GroupPracticeRoom />} />
          <Route path="group-practice/start" element={<GroupPracticeStart />} />
          <Route
            path="group-practice/room/:roomId"
            element={<GroupPracticeCall />}
          />
          <Route path="group-practice/join" element={<GroupPracticeJoin />} />
          <Route
            path="group-practice/join/:code"
            element={<GroupPracticeJoin />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
