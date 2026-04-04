import { Role } from '../../types/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  roles: Role[];
}
