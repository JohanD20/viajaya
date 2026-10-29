import { Link } from 'react-router-dom';

/** Marcador para las pantallas de los Sprints 2 y 3. Borrar cuando la historia esté terminada. */
export function EnConstruccion({ titulo, historia }: { titulo: string; historia: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-extrabold">{titulo}</h1>
      <p className="mt-3 text-lg text-tinta-suave">Esta pantalla se construye en {historia}.</p>
      <Link to="/" className="boton-secundario mt-8">
        Volver a los destinos
      </Link>
    </div>
  );
}
