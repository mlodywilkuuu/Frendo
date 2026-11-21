import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://uzmdnkfvrobnehthsipt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Js7O1T5y5Tn3_WEU_vskOA_3bgFRENZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (selector) => document.querySelector(selector);
const redirectUrl = window.location.origin + window.location.pathname;

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
  if (/email not confirmed/i.test(msg)) return "Potwierdź adres e-mail, klikając link w wiadomości.";
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
  const firstName = $("#signup-first-name").value.trim();
  const lastName = $("#signup-last-name").value.trim();
  const email = $("#signup-email").value.trim().toLowerCase();
  const password = $("#signup-password").value;

  if (!firstName || !lastName || !email || password.length < 8) {
    return setMessage("#signup-message", "Uzupełnij imię, nazwisko, poprawny e-mail i hasło (min. 8 znaków).");
  }

  setBusy(form, true);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName }
    }
  });
  setBusy(form, false);

  if (error) return setMessage("#signup-message", friendlyError(error));

  // Przy włączonym potwierdzaniu e-maila Supabase wysyła kod OTP.
  if (data.session) {
    showView("login");
    setMessage("#login-message", "Konto zostało utworzone. Możesz się zalogować.", "success");
    return;
  }

  $("#verify-email").value = email;
  $("#verify-code").value = "";
  showView("verify");
  setMessage("#verify-message", "Wysłaliśmy 6-cyfrowy kod na " + email + ".", "success");
});

$("#verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = $("#verify-email").value.trim().toLowerCase();
  const token = $("#verify-code").value.trim();

  if (!email || !/^\\d{6}$/.test(token)) {
    return setMessage("#verify-message", "Wpisz adres e-mail i dokładnie 6 cyfr z wiadomości.");
  }

  setBusy(form, true);
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup"
  });
  setBusy(form, false);

  if (error) return setMessage("#verify-message", friendlyError(error));

  if (data.session) {
    await supabase.auth.signOut();
  }

  $("#login-email").value = email;
  $("#login-password").value = "";
  showView("login");
  setMessage("#login-message", "Adres e-mail potwierdzony! Możesz teraz zalogować się na swoje konto.", "success");
});

$("#resend-signup").addEventListener("click", async () => {
  const email = $("#verify-email").value.trim().toLowerCase();
  if (!email) return setMessage("#verify-message", "Najpierw wpisz adres e-mail.");

  const button = $("#resend-signup");
  button.disabled = true;
  button.textContent = "Wysyłanie…";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email
  });

  button.disabled = false;
  button.textContent = "Wyślij kod ponownie";

  if (error) return setMessage("#verify-message", friendlyError(error));
  setMessage("#verify-message", "Wysłaliśmy nowy kod na " + email + ".", "success");
});

$("#recovery-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = $("#recovery-email").value.trim();
  if (!email) return setMessage("#recovery-message", "Wpisz adres e-mail.");
  setBusy(form, true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  setBusy(form, false);
  if (error) return setMessage("#recovery-message", friendlyError(error));
  setMessage("#recovery-message", "Jeśli konto istnieje, wysłaliśmy wiadomość na " + email + ". Kliknij link w wiadomości, aby ustawić nowe hasło.", "success");
});

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showView("reset");
    setMessage("#reset-message", "Link jest poprawny. Wpisz nowe hasło.", "success");
  } else if (event === "SIGNED_IN") {
    showView("login");
    setMessage("#login-message", "Zalogowano poprawnie. Możesz korzystać z Frendo.", "success");
  }
});

$("#reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = $("#new-password").value;
  if (password.length < 8) return setMessage("#reset-message", "Nowe hasło musi mieć co najmniej 8 znaków.");
  setBusy(form, true);
  const { error } = await supabase.auth.updateUser({ password });
  setBusy(form, false);
  if (error) return setMessage("#reset-message", friendlyError(error));
  showView("login");
  setMessage("#login-message", "Hasło zostało zmienione. Zaloguj się nowym hasłem.", "success");
});
