import { USERS_URL, type User } from '../api';
import { useRequest } from '../useRequest';

export function useUsers() {
  return useRequest<User[]>(USERS_URL);
}
