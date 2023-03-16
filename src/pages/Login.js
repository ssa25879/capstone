// import React, { useState } from "react";
// import styled from "styled-components";

// const LoginContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   margin-top: 100px;
// `;

// const LoginForm = styled.form`
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   background-color: #eee;
//   padding: 20px;
//   border-radius: 5px;
// `;

// const LoginInput = styled.input`
//   width: 100%;
//   margin-bottom: 10px;
//   padding: 10px;
//   border: none;
//   border-radius: 5px;
//   font-size: 16px;
// `;

// const LoginButton = styled.button`
//   background-color: #333;
//   color: white;
//   padding: 10px;
//   border: none;
//   border-radius: 5px;
//   font-size: 16px;
//   cursor: pointer;

//   &:hover {
//     background-color: black;
//   }
// `;

// const PasswordChBtn = styled.button`
//   background-color: #333;
//   color: white;
//   padding: 10px;
//   border: none;
//   border-radius: 5px;
//   font-size: 16px;
//   cursor: pointer;
// `;

// function Login() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");

//   const handleUsernameChange = (event) => {
//     setUsername(event.target.value);
//   };

//   const handlePasswordChange = (event) => {
//     setPassword(event.target.value);
//   };

//   const handleSubmit = (event) => {
//     event.preventDefault();
//     console.log(`Username: ${username}, Password: ${password}`);
//   };

//   return (
//     <LoginContainer>
//       <LoginForm onSubmit={handleSubmit}>
//         <LoginInput
//           type="text"
//           placeholder="Username"
//           value={username}
//           onChange={handleUsernameChange}
//         />
//         <LoginInput
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={handlePasswordChange}
//         />
//         <LoginButton type="submit">로그인</LoginButton>
//         <PasswordChBtn type="submit">비밀번호 찾기</PasswordChBtn>
//       </LoginForm>
//     </LoginContainer>
//   );
// }

// export default Login;

import React, { useState } from "react";
import styled from "styled-components";
import Modal from "../components/Modal";

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 100px;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #eee;
  padding: 20px;
  border-radius: 5px;
`;

const LoginInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
`;

const LoginButton = styled.button`
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

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 추가

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsModalOpen(true); // 로그인 버튼 클릭 시 모달 열림
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <LoginContainer>
      <LoginForm onSubmit={handleSubmit}>
        <LoginInput
          type="text"
          placeholder="Username"
          value={username}
          onChange={handleUsernameChange}
        />
        <LoginInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
        />
        <LoginButton type="submit">Log in</LoginButton>
      </LoginForm>
      {isModalOpen && <Modal closeModal={closeModal} />} // 모달이 열릴 때만
      렌더링
    </LoginContainer>
  );
}

export default Login;
