import React from "react";
import styled from "styled-components";

const HeaderContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background-color: black;
`;

const HeaderTitle = styled.h1`
  color: white;
  margin: 0;
  padding: 0;
  padding-left: 20px;
  line-height: 60px;
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

function Header() {
  return (
    <HeaderContainer>
      <HeaderTitle>SNS 사이트 로그인화면</HeaderTitle>
    </HeaderContainer>
  );
}

export default Header;
