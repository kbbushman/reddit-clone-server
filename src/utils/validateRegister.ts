import { UsernamePasswordInput } from '../resolvers/UsernamePasswordInput';

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'Invalid email address',
      }
    ];
  }

  if (options.username.length <= 2) {
    return [
      {
        field: 'username',
        message: 'Username length must be greater than 2',
      }
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'Username cannot include an @ symbol',
      }
    ];
  }

  if (options.password.length <= 3) {
    return [
      {
        field: 'password',
        message: 'Password length must be greater than 3',
      }
    ];
  }

  return null;
};
