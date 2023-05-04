import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import styled from "styled-components";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Modal from "./components/Modal";
import ProfilePage from "./pages/ProfilePage";
import EditBox from "./components/EditBox";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Main = styled.div`
  flex-grow: 1;
  background-color: #1c1c1c;
  color: white;
`;

function App() {
  const [showModal, setShowModal] = React.useState(false);
  return (
    <Router>
      <Container>
        <Header />
        <Main>
          {/* 아래는 테스트 */}
          {showModal && <Modal onClose={() => setShowModal(false)} />}
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Login />} />
          </Routes>
          <ProfilePage />
          <div style={{ marginTop: "7px", paddingBottom: "10px" }}>
            <EditBox />
          </div>
        </Main>
        <Footer />
      </Container>
    </Router>
  );
}

export default App;
