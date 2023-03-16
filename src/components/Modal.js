import React from "react";
import styled from "styled-components";

const ModalContainer = styled.div`
  display: ${({ isOpen }) => (isOpen ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  background-color: white;
  padding: 20px;
  border-radius: 5px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ModalTitle = styled.h2`
  margin: 0;
`;

const ModalCloseButton = styled.button`
  background-color: transparent;
  color: black;
  border: none;
  font-size: 24px;
  cursor: pointer;
`;

const ModalBody = styled.div`
  margin-bottom: 10px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
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

function Modal({ isOpen, onClose, title, children }) {
  return (
    <ModalContainer isOpen={isOpen}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>X</ModalCloseButton>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton onClick={onClose}>OK</ModalButton>
        </ModalFooter>
      </ModalContent>
    </ModalContainer>
  );
}

export default Modal;
