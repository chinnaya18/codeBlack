import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./views/Login";
import RoundSelect from "./views/RoundSelect";
import CodingArena from "./views/CodingArena";
import Leaderboard from "./views/Leaderboard";
import AdminPanel from "./views/AdminPanel";

import "./styles/cyber.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/rounds" element={<RoundSelect />} />
        <Route path="/arena" element={<CodingArena />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
