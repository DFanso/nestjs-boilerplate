import { Role } from '../../types/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  roles: Role[];
}
