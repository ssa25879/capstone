import React, { useState } from "react";

const Profile = ({ user }) => {
  const { profileImage, name, username, bio, followers, following } = user;

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(followers);

  const handleFollowButtonClick = () => {
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);
  };

  return (
    <div>
      <img src={profileImage} alt="프로필 이미지" width="100" height="100" />
      <h1>{name}</h1>
      <h2>@{username}</h2>
      <p>{bio}</p>
      <button onClick={handleFollowButtonClick}>
        {isFollowing ? "언팔로우" : "팔로우"}
      </button>
      <p>
        팔로워: {followerCount} / 팔로잉: {following}
      </p>
    </div>
  );
};

export default Profile;
