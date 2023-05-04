import React from "react";
<<<<<<< Updated upstream
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
=======
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
>>>>>>> Stashed changes

import styled from "styled-components";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Modal from "./components/Modal";

const Container = styled.div`
  display: flex;
  flex-direction: column;
<<<<<<< Updated upstream
  height: 100vh;
=======
  height: 100%;
  background-color: #1c1c1c;
>>>>>>> Stashed changes
`;

const Main = styled.div`
  flex-grow: 1;
  background-color: #1c1c1c;
  color: white;
  height: 100%;
`;

function App() {
  const [showModal, setShowModal] = React.useState(false);
  return (
    <BrowserRouter>
      <Container>
        <Header />
        <Main>
          <Routes>
<<<<<<< Updated upstream
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Login />} />
          </Routes>
=======
            <Route
              path="/"
              element={
                <center>
                  <h2>Home</h2>
                </center>
              }
            />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/About" element={<About />} />
            <Route path="/Login" element={<Login />} />

            {/* 아래는 테스트 */}
            {/* {showModal && <Modal onClose={() => setShowModal(false)} />}
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
          <center>
            <Link to="/">홈</Link>
            <br />
            <hr />
            <Link to="/Signup">회원가입</Link>
            <br />
            <hr />
            <Link to="/About">소개</Link>
            <br />
            <hr />
            <Link to="/Login">로그인</Link>
            <hr />
            <br />
          </center>
>>>>>>> Stashed changes
        </Main>
        <Footer />
        {showModal && <Modal onClose={() => setShowModal(false)} />}
      </Container>
    </BrowserRouter>
  );
}

export default App;
