export type KakaoIdentity = {
  providerUserId: string;
  displayName: string;
  profileImageUrl: string | null;
};

export type OAuthStateAttempt = {
  state: string;
  cookieValue: string;
};

export type OAuthStateResult = {
  returnTo: string;
};
