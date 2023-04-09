import React from "react";
import Profile from "../components/Profile";

const user = {
  profileImage: "C:UsersUserDocumentsGitHubcapstonesrclogo.svg",
  name: "이름",
  username: "아이디",
  bio: "자기소개 글",
  followers: 123,
  following: 456,
};

const ProfilePage = () => {
  return (
    <div>
      <Profile user={user} />
    </div>
  );
};

export default ProfilePage;
