-- ViajaYa · Datos semilla de destinos (desarrollo y demostración).
-- El administrador inicial NO se crea aquí: use `npm run crear-admin -w backend`
-- para no versionar contraseñas ni hashes.

INSERT INTO destinos (nombre, descripcion, precio_base, capacidad_maxima_diaria) VALUES
  ('Parque Nacional Cahuita',   'Sendero costero y snorkel en el arrecife del Caribe Sur.',          40.00, 20),
  ('Canales de Tortuguero',     'Recorrido en bote por los canales y observación de fauna.',         85.00, 15),
  ('Volcán Arenal',             'Caminata por coladas de lava y aguas termales al atardecer.',       65.00, 25),
  ('Manuel Antonio',            'Playas, bosque tropical y monos cariblancos en el Pacífico Central.', 55.00, 30),
  ('Reserva Monteverde',        'Puentes colgantes y bosque nuboso con guía naturalista.',           70.00, 12),
  ('Río Pacuare',               'Rafting clase III–IV con almuerzo típico.',                         95.00, 10)
ON CONFLICT (nombre) DO NOTHING;
