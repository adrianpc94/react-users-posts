import type { Post, User } from '../api';

export const users: User[] = [
  { id: 1, name: 'Leanne Graham' },
  { id: 2, name: 'Ervin Howell' },
  { id: 3, name: 'Clementine Bauch' },
];

export function postsFor(userId: number): Post[] {
  return [
    { id: userId * 10 + 1, userId, title: `User ${userId} post A`, body: 'Body A' },
    { id: userId * 10 + 2, userId, title: `User ${userId} post B`, body: 'Body B' },
  ];
}
