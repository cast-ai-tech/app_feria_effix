-- ============================================================
-- App Feria Effix — FASE 25: Academia con el catálogo COMPLETO real
-- ------------------------------------------------------------
-- Migración 021. Idempotente. GENERADA desde el canal oficial de
-- YouTube @feriaeffix (UCsxnU83FoF0tpNi109PoPng) el 2026-07-24 con el
-- listado completo de subidas (313 videos → conferencias filtradas).
-- Ediciones 2023, 2024 y 2025 embebidas en la app.
-- ============================================================

-- 0. Edición histórica 2023 (fechas aproximadas — solo cataloga Academia).
insert into public.editions (year, name, starts_on, ends_on, days, is_active) values
  (2023, 'Feria Effix 2023', '2023-08-04', '2023-08-06', 3, false)
on conflict (year) do nothing;

-- 1. Fuera los seeds de EJEMPLO (apuntaban todos al mismo video falso).
delete from public.recordings
 where video_url like '%dQw4w9WgXcQ%';

-- 121 conferencias de la edición 2025.
insert into public.recordings (title, speaker_name, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.url, 2025, 'publicada', seed.free
from (values
  ('Eleva tu marca personal', 'Daniela Estacio', 'https://www.youtube.com/watch?v=sbmsmj64Yek', false),
  ('Cómo usar IA para vender en Meta Ads sin molestar clientes', 'Felipe Vergara', 'https://www.youtube.com/watch?v=SnW6MnlRwSI', true),
  ('La integración final: riqueza, impacto y espiritualidad', 'Javi Rodríguez', 'https://www.youtube.com/watch?v=0HeztL3sCQo', false),
  ('Tribus digitales', 'Farid Naffah', 'https://www.youtube.com/watch?v=01JB8wP6GJw', false),
  ('El éxito en los negocios se encuentra en conocerte a ti mismo', 'Jorge Serratos', 'https://www.youtube.com/watch?v=WAvuCD02YcA', false),
  ('Automatizaciones con WhatsApp y llamadas', 'José Salinas', 'https://www.youtube.com/watch?v=szGOuEl_byM', false),
  ('Marketing digital para empresas', 'Coco Plátano Mr Verdes', 'https://www.youtube.com/watch?v=NdS6BeJ8GL4', false),
  ('En Perspectiva: El Arte de Construir Éxito Sostenible', 'Stevenson Rivera', 'https://www.youtube.com/watch?v=7xo5QOnWc5M', false),
  ('Cómo la realidad virtual transforma educación y entretenimiento', 'Olga Gómez Pérez', 'https://www.youtube.com/watch?v=HC7gqdB0hZg', false),
  ('Agentes de IA en acción', 'Joyson Llapo', 'https://www.youtube.com/watch?v=l3nFE8xwwm8', false),
  ('Lovemark, el poder de que amen tu marca', 'Valentina Londoño y Santiago Ospina', 'https://www.youtube.com/watch?v=6anN3Q7NlpM', false),
  ('Estrategias de comercio electrónico para empresas de servicios', 'Mauricio Ortiz', 'https://www.youtube.com/watch?v=rwGpsGPz20o', false),
  ('Conversatorio Marketing de Influencers', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=MozXwbQ2eN0', false),
  ('Estructura empresarial', 'Leidy Grisales', 'https://www.youtube.com/watch?v=NnX3ok6q7pk', false),
  ('CRO (Conversion Rate Optimization)', 'Isaac Varela', 'https://www.youtube.com/watch?v=736xGjOV9dM', false),
  ('Conversatorio Shopify', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=Bnf50SSDqQc', false),
  ('Emprendimiento y Coach empresarial', 'Mr Martin', 'https://www.youtube.com/watch?v=ZTl5Dh3cfeY', false),
  ('Cross-border e-commerce en Latam', 'Gianfranco Preciado', 'https://www.youtube.com/watch?v=SBboQLI5CoU', false),
  ('E-commerce 360: De tienda online a marca global', 'Juan Madrid Carblock', 'https://www.youtube.com/watch?v=fCw-6wYg9u0', false),
  ('Negocios con propósito', 'Marco Lezama', 'https://www.youtube.com/watch?v=911lBDrG-LU', false),
  ('Contabilidad en el mundo digital', 'Yenny Saldarriaga la Contadora', 'https://www.youtube.com/watch?v=kUMeaeod_W8', false),
  ('El poder de los pódcast: estrategias para crecer y monetizar', 'David Llano', 'https://www.youtube.com/watch?v=7tc3HJskPkU', false),
  ('El camino del emprendimiento de una manera cruda', 'Mike Munzvil', 'https://www.youtube.com/watch?v=5xUtxr-17k0', false),
  ('Cómo no fallar en el comercio electrónico', 'Carlos Jiménez y Astrid Carolina Cháves', 'https://www.youtube.com/watch?v=I95KQHerlT8', false),
  ('Marcas que se vuelven legados', 'Victor García', 'https://www.youtube.com/watch?v=i2eyqof_vWk', false),
  ('Marketing Multicanal', 'Enrique López', 'https://www.youtube.com/watch?v=WlMt0NEOsp8', false),
  ('Automatización y realización de contenidos con IA', 'Simón Acosta', 'https://www.youtube.com/watch?v=1zEtT_VT_U4', false),
  ('Negocios desde China', 'Daniel Molina', 'https://www.youtube.com/watch?v=IoT8mB5D66c', false),
  ('Equipos directivos para e-commerce', 'Juan Pablo López', 'https://www.youtube.com/watch?v=c59VX8P3AMg', false),
  ('Estrategias de marketing digital en TikTok', 'Alejandro Herrera', 'https://www.youtube.com/watch?v=vfv5yMPV81c', false),
  ('El poder de no controlar nada y aun así tener éxito', 'Santiago Ospina', 'https://www.youtube.com/watch?v=f6rAZbYx0j8', false),
  ('Creación de tu propio asistente virtual con ChatGPT', 'Santiago Vélez', 'https://www.youtube.com/watch?v=Si1k54Sb_PE', false),
  ('Actualidades y Novedades 2026', 'Albert Rios', 'https://www.youtube.com/watch?v=pOimL7t4Svw', false),
  ('Marca Personal', 'Renzo Martos', 'https://www.youtube.com/watch?v=LFZdcX_r_Hk', false),
  ('Conversión inteligente con IA', 'Nerio Nieves', 'https://www.youtube.com/watch?v=ptKB5achIiQ', false),
  ('Diversificando el Dropshipping: otras formas de monetizar', 'Antonia Villa', 'https://www.youtube.com/watch?v=RwslLmH49KU', false),
  ('Finanzas, mentalidad e inversión', 'Tian Rodríguez', 'https://www.youtube.com/watch?v=znUjxLWX8RE', false),
  ('Cierre de ventas con equipos imparables', 'Jorge Alexander Aponte', 'https://www.youtube.com/watch?v=-PEpciG93bU', false),
  ('IA: el futuro cercano de los anuncios en redes sociales', 'Juan Ads', 'https://www.youtube.com/watch?v=kbG-6xQZ6QQ', false),
  ('Éxito empresarial', 'Wilder Zapata', 'https://www.youtube.com/watch?v=5zuQNhqiDA8', false),
  ('Fashion e-commerce', 'David Rojas', 'https://www.youtube.com/watch?v=nqhRb0OWn8Y', false),
  ('Mentalidad', 'Valentina Ortiz', 'https://www.youtube.com/watch?v=QvJnoyI5p90', false),
  ('De dropshipping a marca propia', 'José Naicipa', 'https://www.youtube.com/watch?v=RNLNdlR0-RY', false),
  ('El arte del StoryFeeling', 'Isaac Chaparro y Edwin Romero', 'https://www.youtube.com/watch?v=oaz_KYCcisc', false),
  ('Contenido viral para tu negocio', 'Libardino Hombre de Dios', 'https://www.youtube.com/watch?v=y9JsFKWjCtQ', false),
  ('CRO: diseño de alta conversión', 'Mateo Costa', 'https://www.youtube.com/watch?v=Y6x5PQJ5PYc', false),
  ('Transferencia del riesgo empresarial y personal', 'Julián David Restrepo', 'https://www.youtube.com/watch?v=4xBrBnIbcrY', false),
  ('Embudos High Ticket', 'Santiago Paz', 'https://www.youtube.com/watch?v=b2alMLE4xxg', false),
  ('Escala con Google Ads', 'Johnny Caprini y Bleider Botero', 'https://www.youtube.com/watch?v=--7IYAE9rbE', false),
  ('$10M de utilidad en tu 1er mes con tu tienda online', 'Diego y Andrés Patarroyo', 'https://www.youtube.com/watch?v=mus0-d5HctY', false),
  ('Cómo escalar un e-commerce con rentabilidad', 'Leo Contra el Tiempo', 'https://www.youtube.com/watch?v=n6vcijHq6EQ', false),
  ('Los 3 enemigos de la grandeza', 'Sebas Klinkert', 'https://www.youtube.com/watch?v=YOr-nZTphvo', false),
  ('Cómo crear un negocio que perdure en el tiempo', 'Eddie Molina y Sergio Porras', 'https://www.youtube.com/watch?v=_DzA_jaeIcQ', false),
  ('Marketing con IA', 'Gabriel Beltrán', 'https://www.youtube.com/watch?v=f6PY57tvTeI', false),
  ('Equipos de Alto Rendimiento', 'Marcos Razzeti', 'https://www.youtube.com/watch?v=uUx_1ZtjV7U', false),
  ('La ciencia de la mente para resultados de alto rendimiento', 'María Sofía Arango', 'https://www.youtube.com/watch?v=nYHRL1mRzrI', false),
  ('Monetización de canales de YouTube', 'Juan Pablo Restrepo', 'https://www.youtube.com/watch?v=cBBdQmEzvOQ', false),
  ('Propósito, espiritualidad y resultados en los negocios', 'Jorge Loza', 'https://www.youtube.com/watch?v=Vp5Et_GqFLw', false),
  ('Estrategias efectivas para reducir la tasa de devoluciones', 'Alberto Barón', 'https://www.youtube.com/watch?v=hPeZ5b8cqUc', false),
  ('Las claves reales para construir un imperio digital', 'David Peri', 'https://www.youtube.com/watch?v=UA1iZul_MX0', false),
  ('Eleva tus ventas en MELI', 'Mauricio Prieto', 'https://www.youtube.com/watch?v=wCXpvsoV23M', false),
  ('Inteligencia artificial en Facebook e Instagram Ads', 'Juan Tamayo', 'https://www.youtube.com/watch?v=ggis3Nl62EU', false),
  ('Una revolución digital en un gigante del retail', 'Sebastián Pérez', 'https://www.youtube.com/watch?v=lJz0ct9rv-I', false),
  ('UX para retener y fidelizar', 'Andrés Acerenza y Alicia Prats', 'https://www.youtube.com/watch?v=ZxeciUUMjis', false),
  ('IAhora o nunca: estrategias para empresas que piensan en grande', 'Frank Cooli', 'https://www.youtube.com/watch?v=WHdAYffnhz0', false),
  ('El mejor momento para crear marca propia', 'Juan Fernando Cardona', 'https://www.youtube.com/watch?v=Qxj7kSC6y6w', false),
  ('TikTok Ads', 'Daniel Aguillón', 'https://www.youtube.com/watch?v=9JFlbwgih1g', false),
  ('Automatización y creación de equipos con IA', 'Regina la Capi', 'https://www.youtube.com/watch?v=MP88PwGMEzg', false),
  ('Mentalidad alineada con crecimiento empresarial', 'César Martínez', 'https://www.youtube.com/watch?v=S9yfFh5p0LY', false),
  ('IA aplicada al e-commerce: cómo automatizar anuncios', 'Rusbel Rodríguez', 'https://www.youtube.com/watch?v=ar1BIlbtoJM', false),
  ('Conversatorio E-Commerce', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=ZvDb5lP4Rz8', false),
  ('Escalando con seguridad', 'Marco Toschi', 'https://www.youtube.com/watch?v=YFTi31-TlSs', false),
  ('Full House: Reservas constantes en alojamientos turísticos', 'David Gómez', 'https://www.youtube.com/watch?v=GegbjjQvDco', false),
  ('Naciste para grandes cosas– De Cero a millonario en E-commerce', 'Iván Caicedo', 'https://www.youtube.com/watch?v=pukaFxX9134', false),
  ('Creando historia desde Latinoamérica', 'Esteban Velásquez', 'https://www.youtube.com/watch?v=Z5eSo4JbEyE', false),
  ('Método de venta brasileño', 'Jesús Gómez', 'https://www.youtube.com/watch?v=g1HCDfNG92s', false),
  ('¿Cómo vender sin necesidad de invertir en pauta?', 'Marc Verdú', 'https://www.youtube.com/watch?v=hR09wqqo_zY', false),
  ('El arte de vender caro y persuadir', 'Mauricio Benoist', 'https://www.youtube.com/watch?v=_Ny7mfItsW8', false),
  ('Emprendiendo en pareja', 'Javi Rodríguez y Valentina Ortiz', 'https://www.youtube.com/watch?v=-n-jt0SqbGE', false),
  ('Diferenciación y comunicación persuasiva', 'Vilma Nuñez', 'https://www.youtube.com/watch?v=YU0_Ptxyyms', false),
  ('Se vale soñar', 'Rigo', 'https://www.youtube.com/watch?v=j1xJ7_z66E8', false),
  ('Surfea los baneos de Facebook y mantén tu operación siempre activa', 'Faiders Altamar', 'https://www.youtube.com/watch?v=uFiNvM5GwGE', false),
  ('Estrategia de contenido orgánico y marca personal', 'Daniiemprende', 'https://www.youtube.com/watch?v=Y4bNJS0dofA', false),
  ('El secreto de la abundancia', 'Daniel Tirado', 'https://www.youtube.com/watch?v=yk4D8xLuhHI', false),
  ('Google Ads para e-commerce', 'César Sánchez', 'https://www.youtube.com/watch?v=_Mtoc_GjbNA', false),
  ('Los superpoderes de LinkedIn', 'Guillermo González Pimiento', 'https://www.youtube.com/watch?v=JFUft_qDBKc', false),
  ('Cómo escalar en e-commerce', 'Fredy López Gutiérrez', 'https://www.youtube.com/watch?v=asm9w_coLo0', false),
  ('Como escalar tu negocio de infoproductos con Hotmart', 'Maria Paula Mendez', 'https://www.youtube.com/watch?v=ojOHLd1yCl8', false),
  ('Mentalidad de riqueza en una cultura de pobreza', 'Iván Mazo', 'https://www.youtube.com/watch?v=3AAFo21aQf0', false),
  ('Marketing con Inteligencia Artificial', 'Juan Diego Libreros', 'https://www.youtube.com/watch?v=wlbZEOsFapo', false),
  ('El nuevo ADN comercial', 'Joco González', 'https://www.youtube.com/watch?v=PwmTmKaCZ78', false),
  ('Psicología de ventas', 'Ana Pierr', 'https://www.youtube.com/watch?v=53q6NSqOwpU', false),
  ('La sinergia necesaria entre proveedor y trafficker', 'Santiago Ramírez', 'https://www.youtube.com/watch?v=g1eNvLzT9FY', false),
  ('El reto de las 6 F: de operador a dueño de negocio', 'César Velilla', 'https://www.youtube.com/watch?v=ljOxfcCdX1I', false),
  ('Esto es warketing', 'Franco Coronel', 'https://www.youtube.com/watch?v=gebvrxve90s', false),
  ('Competir por precio matará tu marca', 'Julián Mora y Nicolás Moreno', 'https://www.youtube.com/watch?v=XuLTywOw5NQ', false),
  ('Los 3 bloqueos invisibles de las empresas', 'Álvaro Luque', 'https://www.youtube.com/watch?v=0gCMxoj_H14', false),
  ('¿Cuánto vale tu empresa y cuánto podría valer?', 'Jackson Rozo', 'https://www.youtube.com/watch?v=buIkU4Ox7T4', false),
  ('Logística enfocada en el servicio', 'Carlos Vilchez', 'https://www.youtube.com/watch?v=3xSRCP5O2kA', false),
  ('El poder de las membresías', 'José Herrera', 'https://www.youtube.com/watch?v=UYLKa1CtYZw', false),
  ('La inteligencia artificial aplicada en Mercado Libre', 'Diego Domanico', 'https://www.youtube.com/watch?v=ELsSnTOJsWc', false),
  ('Personal Branding', 'Santi Emprende', 'https://www.youtube.com/watch?v=c49PkuKDaCg', false),
  ('Transformación, mentalidad, crecimiento empresarial', 'Juliana Taborda', 'https://www.youtube.com/watch?v=vpQchDwhzWE', false),
  ('Los mínimos legales que necesita un e-commerce', 'José Porras', 'https://www.youtube.com/watch?v=fjCpa_caQ7c', false),
  ('Unificar las redes para una base de datos rentable', 'Mauro Cuevas', 'https://www.youtube.com/watch?v=a9g5jpj_Rr8', false),
  ('Innovación, educación y economía', 'José Manuel Restrepo', 'https://www.youtube.com/watch?v=2p9c-hNqruQ', false),
  ('Transformando el servicio, actitud y customer experience para equipos', 'Caro Calle', 'https://www.youtube.com/watch?v=HckWPII9D7k', false),
  ('Conversatorio E-Commerce — Panel Feria Effix', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=sxaCoXAF8ug', false),
  ('No te pagan por lo que haces, te pagan por quien eres.', 'Karolina Puente', 'https://www.youtube.com/watch?v=9IoYE0dpEIE', false),
  ('Seguimiento avanzado de conversiones (PIXEL Y API)', 'Juan Esteban Peña', 'https://www.youtube.com/watch?v=TBELO9JOusQ', false),
  ('Estrategias de e-commerce por suscripción', 'Santiago Cruz', 'https://www.youtube.com/watch?v=LWAF75S0QgM', false),
  ('De empresa familiar a familia empresaria', 'Juan C. Ochoa y Luz I. Ochoa', 'https://www.youtube.com/watch?v=qAy4x-IKLPs', false),
  ('Logística en piloto automático', 'Mauricio Corzo', 'https://www.youtube.com/watch?v=PaIYYWXK-GM', false),
  ('Escalamiento Grow marketing', 'Adri Kastel', 'https://www.youtube.com/watch?v=dMnBl3KaC1I', false),
  ('Eficiencia Logística', 'Juan Pablo Giraldo', 'https://www.youtube.com/watch?v=AjgDE1UpfXo', false),
  ('Inversiones millonarias que pagan mis jets', 'Yoel Sardiñas', 'https://www.youtube.com/watch?v=u83bRsLxVfA', false),
  ('Agentes de IA', 'David Rodríguez Pinto', 'https://www.youtube.com/watch?v=D5VnhVAGuFk', false),
  ('El poder del Networking con acción', 'Fernando Anzures', 'https://www.youtube.com/watch?v=DiA3C1kRO4I', false),
  ('El poder de la mente', 'Tomás Gracia', 'https://www.youtube.com/watch?v=fTfddXJZ-tE', false),
  ('Lanzamiento para América, Facebook livestream Shopping', 'Mauro Cuevas', 'https://www.youtube.com/watch?v=sO4G8zJM4a8', false),
  ('Promociones Épicas: Como crecer sin despilfarrar el dinero', 'Pablo Villegas', 'https://www.youtube.com/watch?v=08_HmX23Hm8', false)
) as seed(title, speaker, url, free)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2025
);

-- 74 conferencias de la edición 2024.
insert into public.recordings (title, speaker_name, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.url, 2024, 'publicada', seed.free
from (values
  ('Lo que menos importan son las campañas', 'Víctor García', 'https://www.youtube.com/watch?v=Dju4Eimyg24', false),
  ('De cero al éxito en dropshipping', 'Manuel Velázquez y Karen Naranjo', 'https://www.youtube.com/watch?v=m1Ba80srW6c', false),
  ('La clave está en las alianzas', 'Alejandro Daztone', 'https://www.youtube.com/watch?v=HDMuuTlI3Rw', false),
  ('Shopify avanzado para ventas consistentes y rentables', 'Juan Felipe Céspedes', 'https://www.youtube.com/watch?v=rd55IS-1f1g', false),
  ('Activación de marca', 'Willdiman Mira', 'https://www.youtube.com/watch?v=J1x-zZ5TtbY', false),
  ('claves del éxito en comercio exterior 🇨🇴', 'Bairon Agudelo y Eliana Grialdo', 'https://www.youtube.com/watch?v=Odq2sEZWpOY', false),
  ('Posicionamiento de una marca en 14 países', 'Juan Fernando Cardona', 'https://www.youtube.com/watch?v=H81zCx1F7fA', false),
  ('En tiempos de los negocios digitales, se habla en público', 'Carlos Cardona', 'https://www.youtube.com/watch?v=s0Dsz_W7wlY', false),
  ('Transformando modelos de negocio con marketing para empresas', 'Kenny + Empresas', 'https://www.youtube.com/watch?v=rUsvarxfPZY', false),
  ('TikTok Ads Élite: Estrategias y tácticas para expertos en publicidad', 'Luis Ángel', 'https://www.youtube.com/watch?v=tfeUhZVOCEc', false),
  ('Despierta tu marca: de lo ordinario a lo extraordinario', 'Pablo y Daniel Montalvo', 'https://www.youtube.com/watch?v=Ey3_z2Ynuts', false),
  ('Enfoque Jurídico de la Constitución y el Desarrollo de tu E-commerce', 'Jose Porras', 'https://www.youtube.com/watch?v=6t0GK664Wgo', false),
  ('Duplica tu margen de utilidad con el método ODA', 'Miguel Gonzalez', 'https://www.youtube.com/watch?v=MWCSoIl7pz4', false),
  ('Optimización contable para negocios de comercio electrónico', 'Yenny Saldarriaga', 'https://www.youtube.com/watch?v=GXrswfJG7so', false),
  ('Creativos que venden miles de millones', 'Sebastián Sánchez', 'https://www.youtube.com/watch?v=24xRC4xZJDU', false),
  ('Cómo duplicar las ventas de tu e-commerce con Instagram', 'Juan Cruz Arocena', 'https://www.youtube.com/watch?v=_gydn9w8Fvs', false),
  ('tendencias y estrategias', 'Conversatorio El futuro del eCommerce en Ecuador', 'https://www.youtube.com/watch?v=BN0LydRw8ns', false),
  ('palabras que venden: dominando el copywriting para ecommerce', 'Jhon Villalba', 'https://www.youtube.com/watch?v=tTq0m4fhHUE', false),
  ('Cómo escalar tus campañas de Facebook Ads sin disminuir tu ROAS', 'Felipe Vergara', 'https://www.youtube.com/watch?v=FcSnLYk64jI', false),
  ('Ellos están aquí. IA para emprendedores', 'David Rodríguez', 'https://www.youtube.com/watch?v=TDPSZjMJJRA', false),
  ('Estrategia de fidelización y marketing avanzado', 'Edwin Hernández', 'https://www.youtube.com/watch?v=zn0YR98_kkY', false),
  ('Los ángulos de venta que nadie te ha contado', 'José Naicipa y Leonardo Franco', 'https://www.youtube.com/watch?v=Fqt8dez00X0', false),
  ('Ahorro Hipotecario – Ahorra tiempo y dinero millonario', 'BangK', 'https://www.youtube.com/watch?v=6JDtv5yUzI8', false),
  ('Estrategia de alianzas con marcas grandes', 'Tiago Andrade', 'https://www.youtube.com/watch?v=lV7d5H7YKyo', false),
  ('Construyendo marcas exitosas en dropshipping', 'Franco Coronel', 'https://www.youtube.com/watch?v=w1Do2jpru50', false),
  ('El poder del alma en los negocios', 'Julian Oquendo', 'https://www.youtube.com/watch?v=2YvcxvHu8uw', false),
  ('E-commerce sin filtros: mitos, verdades y oportunidades', 'Bodega de Belleza', 'https://www.youtube.com/watch?v=Hyex18IqX1U', false),
  ('transformando los procesos del e-commerce', 'Conversatorio Chatbots en acción', 'https://www.youtube.com/watch?v=ma1K6riJXSs', false),
  ('Evolución empresarial la transición de una empresa al e-commerce', 'Cesar Ramos', 'https://www.youtube.com/watch?v=pljVp5AfbJk', false),
  ('Auncios infatigables', 'Rafael Horna', 'https://www.youtube.com/watch?v=J_j5-YzPvfQ', false),
  ('Cómo fabricar en China desde tu país', 'Daniel Molina', 'https://www.youtube.com/watch?v=dk5WzrMaF10', false),
  ('Servicio Postventa, el detalle que enamora', 'Marcos Toschi', 'https://www.youtube.com/watch?v=B-kGTs_4Zb0', false),
  ('Estrategias digitales para el éxito de un e-commerce de moda', 'David Rojas', 'https://www.youtube.com/watch?v=wSWw3prA0K4', false),
  ('Cómo volverte rico haciendo Dropshipping', 'Ivan Caicedo', 'https://www.youtube.com/watch?v=_YD8c1md6Ak', false),
  ('El ADN del Éxito Ser... vicio', 'Juan Jairo Arboleda "El Profe"', 'https://www.youtube.com/watch?v=e7x-a7QQdUg', false),
  ('El poder de lo simple, estrategias de contenido que venden', 'Santiago Paz', 'https://www.youtube.com/watch?v=Fg7cLKgkpo0', false),
  ('Cómo crear anuncios que destaquen en redes sociales', 'Alexandra Suaza', 'https://www.youtube.com/watch?v=6s0oL90Umho', false),
  ('Escala y posicionamiento de OTAs (Airbnb, Booking, Vrbo)', 'Sebastián Jiménez', 'https://www.youtube.com/watch?v=YXhljvHUeME', false),
  ('10 errores que te impiden escalas tus campañas en Facebook Ads', 'Alberto Barón', 'https://www.youtube.com/watch?v=B5LpE-beffM', false),
  ('Gerencia de proyectos para marcas E-commerce', 'Sara Ramírez', 'https://www.youtube.com/watch?v=38fr-i4HTEU', false),
  ('La fuerza de un emprendedor: desa. tu potencial para triunfar', 'Carlos Jiménez', 'https://www.youtube.com/watch?v=n5jsghzRe2U', false),
  ('Constuyendo un negocio exitoso en Amazon, estrategias y secretos', 'Alejandro Pérez', 'https://www.youtube.com/watch?v=lhDKgWelZ6I', false),
  ('Creación de procesos y equipos de trabajo', 'Marcos Razzetti', 'https://www.youtube.com/watch?v=-ygbbqrkgYc', false),
  ('1M de €uros en 23 días con Google Ads', 'Enzo Honore', 'https://www.youtube.com/watch?v=B48dZ_PHJFs', false),
  ('Logística para los retos del E-commerce de hoy', 'Coordinadora', 'https://www.youtube.com/watch?v=IDzjv_iSnCs', false),
  ('Cómo escalar de 50 a 200 pedido en 1 día', 'D&A Academy', 'https://www.youtube.com/watch?v=-pIyfKiryFs', false),
  ('Campañas especi. para Black Friday y fechas de dcto. con alto ROAS', 'Juan Tamayo', 'https://www.youtube.com/watch?v=ia7fNGi8jrY', false),
  ('La revolución logística', 'Andrés Zambrano', 'https://www.youtube.com/watch?v=65nfjeHUfg8', false),
  ('Planeación estratégica para expandir tu negocio', 'Juan Pablo Lopez', 'https://www.youtube.com/watch?v=I6gIww8zDEs', false),
  ('utiliza estos 7 secretos en tus páginas para explotar las ventas', 'Laura Blago', 'https://www.youtube.com/watch?v=fA0UqO3ER6s', false),
  ('Innovación y estrategia: la fórmula de las marcas exitosas', 'Crecel', 'https://www.youtube.com/watch?v=3eazN1r60ZY', false),
  ('Escala tu negocio y eleva tu calidad de vida', 'Tati Uribe', 'https://www.youtube.com/watch?v=4WTmMfPMMsE', false),
  ('El poder del nicho: vende mejor, vende más', 'Oscar Money Cantor', 'https://www.youtube.com/watch?v=iK4nzhT3IC0', false),
  ('Cómo solucionar problemas con la metodología contra corriente', 'Lucho Ramos', 'https://www.youtube.com/watch?v=HX13okLPFK8', false),
  ('De la Feria al triunfo: Cómo construir un negocio sólido', 'Leidy Grisales', 'https://www.youtube.com/watch?v=we-qApskCUw', false),
  ('Vende + con videos virales, secretos para crear cont. irresistible', 'Jhei Trujillo', 'https://www.youtube.com/watch?v=0_j61dZsNTM', false),
  ('Más allá de los anuncios: desbloqueando el potencial orgánico', 'Danii Emprende', 'https://www.youtube.com/watch?v=tnnRG2nbSJM', false),
  ('Historias que venden', 'Monica Montañez', 'https://www.youtube.com/watch?v=Iy8rjJbwGwo', false),
  ('Acción masiva imperfecta', 'Daniel Tirado', 'https://www.youtube.com/watch?v=0ZKvlNoJXFQ', false),
  ('De deudas a libertad con 16 años el camino de una joven Emprende.', 'Antonia Villa', 'https://www.youtube.com/watch?v=zOV8St3oyGI', false),
  ('Maximizando conversiones: Embudos de venta en Publicidad Nueva', 'Taboola', 'https://www.youtube.com/watch?v=LI1JHAP7ZBo', false),
  ('Cómo Hyper-escalar de $0 a $14M de dólares al año', 'Santiago Cruz', 'https://www.youtube.com/watch?v=gnHfa1T2O8A', false),
  ('Anuncios Inteligentes: la era de la IA en el Marketing Digital', 'Juan Ads', 'https://www.youtube.com/watch?v=nIpvvjUR41I', false),
  ('Cómo se construye una Startup exitosa con relaciones societarias sanas', 'Bangk', 'https://www.youtube.com/watch?v=shavnJKrEnU', false),
  ('Antitesis del E-commerce', 'Oswaldo Alarcón', 'https://www.youtube.com/watch?v=byW37Y92z_Q', false),
  ('Cómo los empresarios exitosos toman decisiones', 'Alvaro Luque', 'https://www.youtube.com/watch?v=NA67eueEnvQ', false),
  ('Emprendimiento consciente, expansión interior y transformación', 'Javi Rodriguez', 'https://www.youtube.com/watch?v=sEHZVLNlwTs', false),
  ('¿Por qué si vendo bien, al final no gano dinero?', 'Marco Lezama', 'https://www.youtube.com/watch?v=tduPK72j6aE', false),
  ('Industrias Creativas', 'Roberto Rave', 'https://www.youtube.com/watch?v=K3GtKrAcAWc', false),
  ('Construyendo un Legado de Propósito y Amor', 'Santiago Ospina', 'https://www.youtube.com/watch?v=F_Kh7Yj3oZ8', false),
  ('Abundancia se escribe con "V"', 'Mike Munzvil', 'https://www.youtube.com/watch?v=3V3RCDMZU6E', false),
  ('¡Máquinas Let´s Go!', 'Ponencia Llados Fitness', 'https://www.youtube.com/watch?v=hUFoLm7jzdg', false),
  ('Ponencia Virally', 'César Sánchez y David Moreno', 'https://www.youtube.com/watch?v=S0PaLEEI4oQ', false),
  ('Círculo Secreto', 'Ponencia Diego Gutierrez', 'https://www.youtube.com/watch?v=a5LecIgrddI', false)
) as seed(title, speaker, url, free)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2024
);

-- 9 conferencias de la edición 2023.
insert into public.recordings (title, speaker_name, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.url, 2023, 'publicada', seed.free
from (values
  ('Potencia tus ventas con anuncios de Taboola', 'Guilherme Lopes y Fernando Herrera', 'https://www.youtube.com/watch?v=WRasj6Hup3o', false),
  ('Cómo vender en Mercado Libre', 'James Ossa', 'https://www.youtube.com/watch?v=R8oYIv7w5Eg', false),
  ('Decodificando los Secretos del Ecommerce', 'César Sanchez', 'https://www.youtube.com/watch?v=qNJgzOyoO4I', false),
  ('Conversatorio Faiders Altamar, Andrey Rojas, Juan Toro', 'Feria Effix', 'https://www.youtube.com/watch?v=itgOqx9HhHc', false),
  ('Negocios & Proveedores', 'Santiago Ramírez, Alejandro Daztone, Luis Núñez', 'https://www.youtube.com/watch?v=afcH4RNkJ8k', false),
  ('Productos Físicos vs Productos Digitales', 'Edwin Hernández y Mike Munzvil', 'https://www.youtube.com/watch?v=i5b_loSObyg', false),
  ('Tiago Rojas', 'Decodificando el Éxito de los Expertos', 'https://www.youtube.com/watch?v=jG5sJJNxLUo', false),
  ('Ponencia sobre Automatizaciones', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=2Qzaj4z8wbM', false),
  ('Ponencia Plataformas para realizar Dropshipping', 'Panel Feria Effix', 'https://www.youtube.com/watch?v=fNQnpnk39QY', false)
) as seed(title, speaker, url, free)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2023
);

-- 2. Dedup de seguridad: si el mismo VIDEO quedó dos veces en una edición
--    (títulos con variaciones), se conserva la fila más antigua.
delete from public.recordings r
 using public.recordings k
 where r.ctid <> k.ctid
   and r.edition = k.edition
   and substring(r.video_url from 'v=([A-Za-z0-9_-]{11})') is not null
   and substring(r.video_url from 'v=([A-Za-z0-9_-]{11})')
     = substring(k.video_url from 'v=([A-Za-z0-9_-]{11})')
   and r.created_at > k.created_at;
-- ============================================================
-- Apéndice: ediciones FUNDACIONALES 2021 y 2022 (canal oficial)
-- + 2 conferencias de 2023 que el parser automático no capturó.
-- ============================================================

insert into public.editions (year, name, starts_on, ends_on, days, is_active) values
  (2021, 'Feria Effix 2021', '2021-10-01', '2021-10-03', 3, false),
  (2022, 'Feria Effix 2022', '2022-08-05', '2022-08-07', 3, false)
on conflict (year) do nothing;

-- 13 conferencias de la edición 2022.
insert into public.recordings (title, speaker_name, description, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.descr, seed.url, 2022, 'publicada', false
from (values
  ('Conferencia de Santiago Cruz', 'Santiago Cruz', 'CEO de Fourth Plannet', 'https://www.youtube.com/watch?v=fdTIUDQ9wJs'),
  ('Conferencia de Juan Diego Libreros', 'Juan Diego Libreros', 'CEO de Grupo Ecommerce', 'https://www.youtube.com/watch?v=sdR4x-Z3NPI'),
  ('Conferencia de Diana Pulgarín', 'Diana Pulgarín', 'La odontóloga #1 de Colombia', 'https://www.youtube.com/watch?v=QtCNY48hwP0'),
  ('Conferencia de Enrique Segura', 'Enrique Segura', 'Director de Revenue para Latinoamérica de Hotmart', 'https://www.youtube.com/watch?v=uLMCLsdY9BU'),
  ('Conferencia de Tati Uribe', 'Tati Uribe', 'Creadora de contenido y mentora de emprendedores', 'https://www.youtube.com/watch?v=CPKQSlACFlk'),
  ('Conferencia de Alejandro Castro', 'Alejandro Castro', 'Cofundador de Landian', 'https://www.youtube.com/watch?v=XYBUiG-HjBI'),
  ('Conferencia de Ricardo Rodríguez', 'Ricardo Rodríguez', 'Experto en estrategia digital', 'https://www.youtube.com/watch?v=pA4gHYDP_TQ'),
  ('Conferencia de Tiago Rojas', 'Tiago Rojas', 'CEO de 3pod', 'https://www.youtube.com/watch?v=WywYcAiqBxM'),
  ('Conferencia de Alejandro Martin', 'Alejandro Martin', 'CEO y fundador de La Tamalería', 'https://www.youtube.com/watch?v=f9yedjIOIJI'),
  ('Conferencia de Felipe Vergara', 'Felipe Vergara', 'Consultor de marketing digital', 'https://www.youtube.com/watch?v=TsUTOPKRX4g'),
  ('Conferencia de Sara Montoya', 'Sara Montoya', 'Experta en logística y cofundadora de Grupo Effi', 'https://www.youtube.com/watch?v=m99HP8SYJFM'),
  ('Conferencia de Andrés Zambrano', 'Andrés Zambrano', 'CEO de GINTRACOM', 'https://www.youtube.com/watch?v=i6nYvL0sET8'),
  ('Conferencia de Alberto Barón', 'Alberto Barón', 'Experto en comercio electrónico', 'https://www.youtube.com/watch?v=VauNAsqaD-g')
) as seed(title, speaker, descr, url)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2022
);

-- 6 conferencias de la edición 2021.
insert into public.recordings (title, speaker_name, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.url, 2021, 'publicada', false
from (values
  ('Estrategias logísticas en Colombia', 'Sara Montoya', 'https://www.youtube.com/watch?v=F6yg3lmGqDE'),
  ('De emprendedores a empresarios', 'David Rojas y Diego Aguirre', 'https://www.youtube.com/watch?v=-AQPnIuFfcU'),
  ('Dropshipping y productos ganadores', 'Juan David Carmona', 'https://www.youtube.com/watch?v=rXz_ZlzM37o'),
  ('Control y organización de los e-commerce', 'Stevenson Rivera', 'https://www.youtube.com/watch?v=NRiQIMk6fGA'),
  ('Estrategia de anuncios publicitarios en Facebook', 'Felipe Vergara', 'https://www.youtube.com/watch?v=YjfqIEXJdcE'),
  ('Conferencia de Santiago Ospina', 'Santiago Ospina', 'https://www.youtube.com/watch?v=NqZHvQFmNyU')
) as seed(title, speaker, url)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2021
);

-- 2 conferencias de 2023 fuera del patrón automático.
insert into public.recordings (title, speaker_name, video_url, edition, status, is_free)
select seed.title, seed.speaker, seed.url, 2023, 'publicada', false
from (values
  ('Triunfando en grande: número 1 de ventas en la Feria Effix 2022', 'Alberto Barón', 'https://www.youtube.com/watch?v=qPNAWWMDl4w'),
  ('Potencia tus ventas con anuncios de Taboola', 'Guilherme Lopes y Fernando Herrera', 'https://www.youtube.com/watch?v=WRasj6Hup3o')
) as seed(title, speaker, url)
where not exists (
  select 1 from public.recordings r
   where r.title = seed.title and r.edition = 2023
);
