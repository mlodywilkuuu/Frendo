import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://uzmdnkfvrobnehthsipt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Js7O1T5y5Tn3_WEU_vskOA_3bgFRENZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (selector) => document.querySelector(selector);
let pendingEmail = "";
let recoveryEmail = "";

function showView(name) {
  document.querySelectorAll(".auth-view").forEach((view) => {
    view.hidden = view.id !== name + "-view";
  });
  document.querySelectorAll(".form-message").forEach((el) => {
    el.textContent = "";
    el.className = "form-message";
  });
}
function setMessage(id, text, kind = "error") {
  const el = $(id);
  el.textContent = text;
  el.className = "form-message " + kind;
}
function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.dataset.originalText ||= button.textContent;
  button.textContent = busy ? "Chwileczkę…" : button.dataset.originalText;
}
function friendlyError(error) {
  const msg = error?.message || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
  if (/invalid login credentials/i.test(msg)) return "Nieprawidłowy e-mail lub hasło.";
  if (/email not confirmed/i.test(msg)) return "Potwierdź najpierw adres e-mail kodem z wiadomości.";
  if (/password should be at least/i.test(msg)) return "Hasło jest za krótkie.";
  if (/user already registered/i.test(msg)) return "Konto z tym adresem e-mail już istnieje. Zaloguj się lub zresetuj hasło.";
  if (/rate limit/i.test(msg)) return "Wysłano zbyt wiele wiadomości. Odczekaj chwilę i spróbuj ponownie.";
  return msg;
}

document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $("#" + button.dataset.toggle);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Pokaż" : "Ukryj";
  });
});
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
$("#show-signup").addEventListener("click", () => showView("signup"));
$("#forgot-link").addEventListener("click", (event) => {
  event.preventDefault();
  $("#recovery-email").value = $("#login-email").value.trim();
  showView("recovery");
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  if (!email || !password) return setMessage("#login-message", "Wpisz adres e-mail i hasło.");
  setBusy(form, true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(form, false);
  if (error) return setMessage("#login-message", friendlyError(error));
  setMessage("#login-message", "Zalogowano poprawnie. System kont Frendo jest połączony.", "success");
  console.info("Frendo user session active:", data.user?.id);
});

$("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const username = $("#signup-name").value.trim();
  const email = $("#signup-email").value.trim();
  const password = $("#signup-password").value;
  if (!username || !email || password.length < 8) return setMessage("#signup-message", "Uzupełnij nazwę, poprawny e-mail i hasło (min. 8 znaków).");
  pendingEmail = email;
  setBusy(form, true);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  setBusy(form, false);
  if (error) return setMessage("#signup-message", friendlyError(error));
  if (data.session) {
    showView("login");
    return setMessage("#login-message", "Konto utworzone. Możesz się zalogować.", "success");
  }
  showView("verify");
  setMessage("#verify-message", "Kod potwierdzający został wysłany na " + email + ".", "success");
});

$("#verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const token = $("#verify-code").value.trim();
  if (!pendingEmail || !/^\d{6}$/.test(token)) return setMessage("#verify-message", "Wpisz 6-cyfrowy kod z wiadomości.");
  setBusy(form, true);
  const { error } = await supabase.auth.verifyOtp({ email: pendingEmail, token, type: "signup" });
  setBusy(form, false);
  if (error) return setMessage("#verify-message", friendlyError(error));
  showView("login");
  $("#login-email").value = pendingEmail;
  setMessage("#login-message", "Adres e-mail potwierdzony! Możesz się zalogować.", "success");
});
$("#resend-signup").addEventListener("click", async () => {
  if (!pendingEmail) return setMessage("#verify-message", "Wróć do rejestracji i wpisz swój adres e-mail.");
  const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail });
  if (error) return setMessage("#verify-message", friendlyError(error));
  setMessage("#verify-message", "Wysłaliśmy nowy kod na " + pendingEmail + ".", "success");
});

$("#recovery-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  recoveryEmail = $("#recovery-email").value.trim();
  if (!recoveryEmail) return setMessage("#recovery-message", "Wpisz adres e-mail.");
  setBusy(form, true);
  const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail);
  setBusy(form, false);
  if (error) return setMessage("#recovery-message", friendlyError(error));
  showView("reset");
  setMessage("#reset-message", "Jeśli konto istnieje, wysłaliśmy kod resetujący na " + recoveryEmail + ".", "success");
});

$("#reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const token = $("#reset-code").value.trim();
  const password = $("#new-password").value;
  if (!recoveryEmail || !/^\d{6}$/.test(token)) return setMessage("#reset-message", "Wpisz 6-cyfrowy kod z wiadomości.");
  if (password.length < 8) return setMessage("#reset-message", "Nowe hasło musi mieć co najmniej 8 znaków.");
  setBusy(form, true);
  const { error: verifyError } = await supabase.auth.verifyOtp({ email: recoveryEmail, token, type: "recovery" });
  if (verifyError) {
    setBusy(form, false);
    return setMessage("#reset-message", friendlyError(verifyError));
  }
  const { error: updateError } = await supabase.auth.updateUser({ password });
  setBusy(form, false);
  if (updateError) return setMessage("#reset-message", friendlyError(updateError));
  showView("login");
  $("#login-email").value = recoveryEmail;
  setMessage("#login-message", "Hasło zostało zmienione. Zaloguj się nowym hasłem.", "success");
});
