import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Custom validator pentru parolă
 * Cerințe: min 8 caractere, o literă MARE, una mică, o cifră și un caracter special
 */
export function passwordValidator(
  control: AbstractControl
): ValidationErrors | null {
  if (!control.value) {
    return null; // Nu valida dacă e gol (required validator va gestiona asta)
  }

  const password = control.value;
  const errors: ValidationErrors = {};

  // Verifica lungimea minima
  if (password.length < 8) {
    errors['minLength'] = true;
  }

  // Verifica dacă are cel puțin o literă mică
  if (!/[a-z]/.test(password)) {
    errors['noLowerCase'] = true;
  }

  // Verifica dacă are cel puțin o literă mare
  if (!/[A-Z]/.test(password)) {
    errors['noUpperCase'] = true;
  }

  // Verifica dacă are cel puțin o cifră
  if (!/\d/.test(password)) {
    errors['noDigit'] = true;
  }

  // Verifica dacă are cel puțin un caracter special (non-alfanumeric)
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors['noSpecialChar'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Funcție helper pentru a verifica dacă o parolă e validă
 */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}
