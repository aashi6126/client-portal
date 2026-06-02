// Mirror of services/api/customer_api.py::_COMMON_PASSWORDS. Keep in sync.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password!', 'passw0rd',
  '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789',
  'qwerty', 'qwerty123', 'qwertyuiop', 'qwerty1234', 'asdfgh', 'asdfghjkl',
  'abc12345', 'abc123456', 'a1b2c3d4', 'a1b2c3d4e5',
  'letmein', 'letmein1', 'letmein123', 'letmein!',
  'welcome', 'welcome1', 'welcome123', 'welcome!', 'changeme', 'changeme1', 'changeme123',
  'admin', 'admin1', 'admin12', 'admin123', 'admin1234', 'administrator',
  'root1234', 'rootroot', 'login123', 'guest123', 'user1234',
  'test1234', 'test12345', 'testtest', 'test1test',
  'monkey123', 'dragon123', 'master123', 'shadow123', 'superman1', 'batman123',
  'sunshine1', 'sunshine123', 'iloveyou', 'iloveyou1', 'iloveyou123',
  'princess1', 'princess123', 'football1', 'football123', 'baseball1', 'baseball123',
  'starwars1', 'pokemon123', 'hello1234', 'hellothere', 'helloworld',
  'qazwsxedc', 'zaq12wsx', '1qaz2wsx', 'trustno1!', 'whatever1', 'freedom1',
  'azerty123', 'p@ssw0rd', 'p@ssword1', 'pa$$word1', 'passw0rd1', 'passw0rd!',
  'qweqweqwe', 'qweasdzxc', 'asdasdasd', '11111111', '00000000',
  '12121212', '11223344', '147258369', '987654321', '696969696',
  'computer1', 'internet1', 'company123', 'business1', 'office123',
  'january1', 'february1', 'september1',
  'summer2024', 'summer2025', 'summer2026', 'winter2025', 'winter2026',
  'spring2025', 'spring2026', 'autumn2025',
  'clienthub', 'clienthub1', 'clientportal', 'njgroups1',
]);

/**
 * Return the list of rules with their pass/fail state for the given password.
 * Pass an empty `password` to render the unchecked checklist.
 */
export function checkPasswordPolicy(password = '', username = '') {
  const lower = password.toLowerCase();
  return [
    { label: 'At least 10 characters', passed: password.length >= 10 },
    { label: 'Contains a letter', passed: /[a-zA-Z]/.test(password) },
    { label: 'Contains a digit', passed: /\d/.test(password) },
    {
      label: 'Different from username',
      passed: !username || (password.length > 0 && lower !== username.toLowerCase()),
    },
    {
      label: 'Not a common password',
      passed: password.length === 0 ? false : !COMMON_PASSWORDS.has(lower),
    },
  ];
}

export function isPasswordValid(password, username = '') {
  if (!password) return false;
  return checkPasswordPolicy(password, username).every((r) => r.passed);
}
