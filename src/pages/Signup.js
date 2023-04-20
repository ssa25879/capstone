import React, { useState } from "react";
import styled from "styled-components";

const SignupContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 100px;
`;

const SignupForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #eee;
  padding: 20px;
  border-radius: 5px;
`;

const SignupInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
`;

const SignupButton = styled.button`
  background-color: #333;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;

  &:hover {
    background-color: black;
  }
`;

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birth, setBirth] = useState("");

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // 서버로 보낼 내용
    console.log(
      `Username: ${username}, Email: ${email}, Password: ${password}, Birth: ${birth}`
    );
  };

  const handleBirthChange = (event) => {
    setBirth(event.target.value);
  };

  return (
    <SignupContainer>
      <SignupForm onSubmit={handleSubmit}>
        <SignupInput
          type="text"
          placeholder="Username"
          value={username}
          onChange={handleUsernameChange}
        />
        <SignupInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={handleEmailChange}
        />
        <SignupInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
        />
        <SignupInput
          type="date"
          placeholder="Date of Birth"
          value={birth}
          onChange={handleBirthChange}
        />
        <SignupButton type="submit">Sign Up</SignupButton>
      </SignupForm>
    </SignupContainer>
  );
}

export default Signup;
