import React from "react";
import styled from "styled-components";

const FooterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 60px;
  background-color: #333;
  color: white;
  position: fixed;
  bottom: 0;
`;

function Footer() {
  return (
    <FooterContainer>
      <p>이 사이트는 디자인 테스트, 레이아웃 확인용 사이트입니다.</p>
    </FooterContainer>
  );
}

export default Footer;
