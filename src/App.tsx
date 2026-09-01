import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AdminRoute, EmployeeRoute } from "@/components/ProtectedRoute";
import { ThemeApplier } from "@/components/ThemeApplier";
import { InstallPrompt } from "@/components/InstallPrompt";

import Landing from "@/pages/Landing";
import Register from "@/pages/employee/Register";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import EmployeeQR from "@/pages/employee/QR";
import EmployeeLeaderboard from "@/pages/employee/Leaderboard";
import EmployeeAttendance from "@/pages/employee/Attendance";
import EmployeeScream from "@/pages/employee/ScreamMachine";
import EmployeeTradeOff from "@/pages/employee/TradeOff";

import GuestLogin from "@/pages/guest/Login";
import GuestDashboard from "@/pages/guest/Dashboard";
import GuestQR from "@/pages/guest/QR";
import GuestLeaderboard from "@/pages/guest/Leaderboard";
import GuestAttendance from "@/pages/guest/Attendance";
import GuestScream from "@/pages/guest/ScreamMachine";

import AdminLogin from "@/pages/admin/Login";
import Scanner from "@/pages/admin/Scanner";
import Play from "@/pages/admin/Play";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminLeaderboard from "@/pages/admin/Leaderboard";
import Games from "@/pages/admin/Games";
import Teams from "@/pages/admin/Teams";
import Employees from "@/pages/admin/Employees";
import Roster from "@/pages/admin/Roster";
import History from "@/pages/admin/History";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminScreamMachine from "@/pages/admin/ScreamMachine";
import AdminTradeOff from "@/pages/admin/TradeOff";
import { AdminShell } from "@/components/AdminShell";

function AdminPage({ children, roles }: { children: React.ReactNode; roles?: ("super" | "scanner" | "viewer")[] }) {
  return (
    <AdminRoute roles={roles}>
      <AdminShell>{children}</AdminShell>
    </AdminRoute>
  );
}

export default function App() {
  return (
    <>
      <ThemeApplier />
      <InstallPrompt />
      <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Employee */}
        <Route
          path="/employee/register"
          element={
            <EmployeeRoute>
              <Register />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/dashboard"
          element={
            <EmployeeRoute>
              <EmployeeDashboard />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/qr"
          element={
            <EmployeeRoute>
              <EmployeeQR />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/leaderboard"
          element={
            <EmployeeRoute>
              <EmployeeLeaderboard />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <EmployeeRoute>
              <EmployeeAttendance />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/scream"
          element={
            <EmployeeRoute>
              <EmployeeScream />
            </EmployeeRoute>
          }
        />
        <Route
          path="/employee/tradeoff"
          element={
            <EmployeeRoute>
              <EmployeeTradeOff />
            </EmployeeRoute>
          }
        />

        {/* Guest */}
        <Route
          path="/guest/login"
          element={
            <EmployeeRoute>
              <GuestLogin />
            </EmployeeRoute>
          }
        />
        <Route
          path="/guest/dashboard"
          element={
            <EmployeeRoute>
              <GuestDashboard />
            </EmployeeRoute>
          }
        />
        <Route
          path="/guest/qr"
          element={
            <EmployeeRoute>
              <GuestQR />
            </EmployeeRoute>
          }
        />
        <Route
          path="/guest/leaderboard"
          element={
            <EmployeeRoute>
              <GuestLeaderboard />
            </EmployeeRoute>
          }
        />
        <Route
          path="/guest/attendance"
          element={
            <EmployeeRoute>
              <GuestAttendance />
            </EmployeeRoute>
          }
        />
        <Route
          path="/guest/scream"
          element={
            <EmployeeRoute>
              <GuestScream />
            </EmployeeRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/play" element={<AdminPage roles={["super", "scanner"]}><Play /></AdminPage>} />
        <Route path="/admin/scanner" element={<AdminPage roles={["super", "scanner"]}><Scanner /></AdminPage>} />
        <Route path="/admin/dashboard" element={<AdminPage><AdminDashboard /></AdminPage>} />
        <Route path="/admin/leaderboard" element={<AdminPage><AdminLeaderboard /></AdminPage>} />
        <Route path="/admin/attendance" element={<AdminPage><AdminAttendance /></AdminPage>} />
        <Route path="/admin/scream" element={<AdminPage roles={["super", "scanner"]}><AdminScreamMachine /></AdminPage>} />
        <Route path="/admin/tradeoff" element={<AdminPage roles={["super", "scanner"]}><AdminTradeOff /></AdminPage>} />
        <Route path="/admin/games" element={<AdminPage roles={["super"]}><Games /></AdminPage>} />
        <Route path="/admin/teams" element={<AdminPage roles={["super"]}><Teams /></AdminPage>} />
        <Route path="/admin/employees" element={<AdminPage roles={["super"]}><Employees /></AdminPage>} />
        <Route path="/admin/roster" element={<AdminPage roles={["super"]}><Roster /></AdminPage>} />
        <Route path="/admin/history" element={<AdminPage><History /></AdminPage>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AnimatePresence>
    </>
  );
}
