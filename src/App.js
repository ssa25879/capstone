import React from "react";
import "react-router-dom";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import styled from "styled-components";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import About from "./pages/About/About";
import Modal from "./components/Modal";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
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
          <Routes>
            <Route path="/pages/Signup" element={<Signup />} />
            {/* 아래는 테스트
          {showModal && <Modal onClose={() => setShowModal(false)} />}
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Login />} />
          </Routes>
          <ProfilePage />
          <div style={{ marginTop: "7px", paddingBottom: "10px" }}>
            <EditBox />
          </div> */}
          </Routes>
        </Main>
        <Footer />
      </Container>
    </Router>
  );
}

export default App;
