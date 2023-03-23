import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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
  height: 100vh;
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
          {showModal && <Modal onClose={() => setShowModal(false)} />}
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Login />} />
          </Routes>
        </Main>
        <Footer />
      </Container>
    </Router>
  );
}

export default App;
