const form = document.querySelector("#login-form");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const message = document.querySelector("#form-message");
const togglePassword = document.querySelector("#toggle-password");

togglePassword.addEventListener("click", () => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  togglePassword.textContent = showing ? "Pokaż" : "Ukryj";
  togglePassword.setAttribute("aria-label", showing ? "Pokaż hasło" : "Ukryj hasło");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";

  if (!email.value.trim() || !password.value) {
    message.textContent = "Uzupełnij adres e-mail i hasło.";
    (!email.value.trim() ? email : password).focus();
    return;
  }

  message.textContent = "Wygląd logowania jest gotowy. Prawdziwe logowanie wymaga jeszcze podłączenia bezpiecznego serwera.";
});

document.querySelector("#forgot-link").addEventListener("click", (event) => {
  event.preventDefault();
  message.textContent = "Odzyskiwanie hasła dodamy po uruchomieniu systemu kont.";
});

document.querySelector("#signup-link").addEventListener("click", (event) => {
  event.preventDefault();
  message.textContent = "Formularz tworzenia konta przygotujemy w kolejnym kroku.";
});
