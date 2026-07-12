(() => {
  const storageKey = 'theme';
  let theme = 'light';
  try {
    theme = localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
  } catch {}
  document.documentElement.dataset.theme = theme;

  function updateButton(button) {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.textContent = dark ? '☀️ 라이트' : '🌙 다크';
    button.setAttribute('aria-label', dark ? '라이트 테마로 전환' : '다크 테마로 전환');
    button.setAttribute('aria-pressed', String(dark));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      updateButton(button);
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(storageKey, next); } catch {}
        updateButton(button);
      });
    });
  });
})();
