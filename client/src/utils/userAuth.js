const USER_TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';

export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token) {
  localStorage.setItem(USER_TOKEN_KEY, token);
}

export function removeUserToken() {
  localStorage.removeItem(USER_TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getUserToken();
}

export function getUserData() {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUserData(data) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
}

export function removeUserData() {
  localStorage.removeItem(USER_DATA_KEY);
}

export function logout() {
  removeUserToken();
  removeUserData();
}
