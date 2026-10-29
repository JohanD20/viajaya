/**
 * Guarda el token del administrador en sessionStorage (S-11): se borra al cerrar
 * la pestaña. Envuelto en try/catch porque el almacenamiento puede estar
 * bloqueado (modo privado, políticas del navegador).
 */
const CLAVE = 'viajaya.token';

export const almacenSesion = {
  leer(): string | null {
    try {
      return sessionStorage.getItem(CLAVE);
    } catch {
      return null;
    }
  },
  guardar(token: string): void {
    try {
      sessionStorage.setItem(CLAVE, token);
    } catch {
      /* sin almacenamiento: la sesión dura lo que dure la página */
    }
  },
  borrar(): void {
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      /* nada que borrar */
    }
  },
};
