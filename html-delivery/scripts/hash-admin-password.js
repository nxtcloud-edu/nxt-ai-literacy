#!/usr/bin/env node
const crypto = require('node:crypto');
const readline = require('node:readline');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, passwordHash: crypto.scryptSync(password, salt, 32).toString('hex') };
}

function readFromPipe() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => resolve(input.replace(/\r?\n$/, '')));
    process.stdin.on('error', reject);
  });
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    const onData = (char) => {
      char = String(char);
      if (char === '\n' || char === '\r' || char === '\u0004') return;
      if (char === '\u0003') process.exit(130);
      stdout.write('\b \b');
    };
    stdin.on('data', onData);
    rl.question(prompt, (value) => {
      stdin.off('data', onData);
      rl.close();
      stdout.write('\n');
      resolve(value);
    });
  });
}

(async () => {
  const password = process.stdin.isTTY ? await readHidden('관리자 비밀번호: ') : await readFromPipe();
  if (password.length < 4 || password.length > 30) {
    console.error('비밀번호는 4~30자로 입력하세요.');
    process.exit(1);
  }
  const { passwordHash, salt } = hashPassword(password);
  const sessionSecret = crypto.randomBytes(32).toString('base64url');
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`ADMIN_PASSWORD_SALT=${salt}`);
  console.log(`SESSION_SECRET=${sessionSecret}`);
})();
