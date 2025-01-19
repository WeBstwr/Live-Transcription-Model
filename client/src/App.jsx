import "./assets/globals.css"
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard/Dashboard"
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {

  return (
    <>
    <BrowserRouter>
    <Header />
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
