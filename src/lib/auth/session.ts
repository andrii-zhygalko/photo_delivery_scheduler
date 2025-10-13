import { auth } from './index';

export async function getServerSession() {
  return auth();
}
