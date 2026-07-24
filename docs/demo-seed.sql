-- Demo podatki za predstavitev (promo video, prikaz strankam).
-- Ustvari samostojno društvo »PGD Sončni Vrh« (slug pgd-demo) — izmišljeno,
-- da se v posnetku ne pojavijo podatki pravega društva.
--
-- Zagon (PowerShell, ker Git Bash lomi poti s šumniki):
--   docker cp docs\demo-seed.sql gasilapp-db:/tmp/demo-seed.sql
--   docker exec gasilapp-db psql -U postgres -d gasilapp -f /tmp/demo-seed.sql
--
-- Idempotentno: vsak zagon zavrže in znova zgradi SAMO društvo 'pgd-demo'.
-- Vsi datumi so relativni na CURRENT_DATE, da posnetek nikoli ni zastarel.
--
-- Prijava: uporabniško ime `demo` (ali demo@plamen.si), geslo `GasilApp123!`
-- Vsi demo člani imajo isto geslo.

BEGIN;

DELETE FROM organizations WHERE slug = 'pgd-demo';

INSERT INTO organizations (id, name, slug, address, city, postal_code, phone, email, website, spin_obcine)
VALUES (
  '0de00000-0000-4000-8000-000000000001',
  'PGD Sončni Vrh',
  'pgd-demo',
  'Gasilska cesta 12',
  'Sončni Vrh',
  '2000',
  '02 123 45 67',
  'info@pgd-soncnivrh.si',
  'https://pgd-soncnivrh.si',
  '["Maribor","Ljubljana","Celje","Kranj","Velenje"]'::jsonb
);

-- ── Člani ────────────────────────────────────────────────────────────────────
-- Geslo za vse: GasilApp123!
INSERT INTO users (organization_id, username, email, password_hash, first_name, last_name,
                   phone, address, city, date_of_birth, membership_status, rank,
                   membership_number, joined_at, availability, spin_notifications)
SELECT '0de00000-0000-4000-8000-000000000001', u.username, u.email,
       '$2a$12$ivApUnHjzOcW6bmC3mFEoeBAlbUDvs3NZsi0Ev/oG4ME7LcCQUmI2',
       u.first_name, u.last_name, u.phone, u.address, 'Sončni Vrh', u.dob::date,
       u.status::membership_status, u.rank, u.member_no, u.joined::date,
       u.avail::availability_status, true
FROM (VALUES
  ('demo',            'demo@plamen.si',           'Matej',    'Zupančič',  '041 234 567', 'Gasilska cesta 12', '1985-03-14', 'operative', 'višji gasilec',            'SV-001', '2004-05-01', 'available'),
  ('marko.kovac',     'marko.kovac@pgd.si',       'Marko',    'Kovač',     '041 345 678', 'Pod hribom 4',      '1979-11-02', 'operative', 'gasilski častnik',          'SV-002', '1998-03-12', 'available'),
  ('ana.horvat',      'ana.horvat@pgd.si',        'Ana',      'Horvat',    '051 456 789', 'Cvetlična 8',       '1990-06-21', 'operative', 'gasilec',                   'SV-003', '2010-09-01', 'at_work'),
  ('luka.krajnc',     'luka.krajnc@pgd.si',       'Luka',     'Krajnc',    '031 567 890', 'Ob potoku 15',      '1994-01-30', 'operative', 'gasilec',                   'SV-004', '2013-04-18', 'available'),
  ('nina.potocnik',   'nina.potocnik@pgd.si',     'Nina',     'Potočnik',  '040 678 901', 'Trg svobode 2',     '1996-08-09', 'operative', 'gasilec pripravnik',        'SV-005', '2018-02-05', 'at_home'),
  ('peter.mlakar',    'peter.mlakar@pgd.si',      'Peter',    'Mlakar',    '041 789 012', 'Kmečka pot 21',     '1972-04-17', 'operative', 'nižji gasilski častnik',    'SV-006', '1992-06-10', 'available'),
  ('jure.vidmar',     'jure.vidmar@pgd.si',       'Jure',     'Vidmar',    '051 890 123', 'Gozdna 3',          '1988-12-05', 'operative', 'višji gasilec',             'SV-007', '2007-10-22', 'on_leave'),
  ('spela.turk',      'spela.turk@pgd.si',        'Špela',    'Turk',      '031 901 234', 'Sončna 19',         '1992-02-11', 'operative', 'gasilec',                   'SV-008', '2011-01-15', 'available'),
  ('rok.zajc',        'rok.zajc@pgd.si',          'Rok',      'Zajc',      '040 012 345', 'Mlinska 7',         '1998-07-25', 'operative', 'gasilec',                   'SV-009', '2016-09-03', 'available'),
  ('miha.oblak',      'miha.oblak@pgd.si',        'Miha',     'Oblak',     '041 123 987', 'Zelena ulica 5',    '1983-10-19', 'operative', 'višji gasilec',             'SV-010', '2003-11-08', 'sick'),
  ('katja.golob',     'katja.golob@pgd.si',       'Katja',    'Golob',     '051 234 876', 'Lipova 11',         '2001-05-03', 'operative', 'gasilec',                   'SV-011', '2019-03-20', 'available'),
  ('david.hribar',    'david.hribar@pgd.si',      'David',    'Hribar',    '031 345 765', 'Ribniška 9',        '1975-09-28', 'veteran',   'gasilski častnik I. stopnje','SV-012','1994-02-14', 'at_home'),
  ('franc.bizjak',    'franc.bizjak@pgd.si',      'Franc',    'Bizjak',    '041 456 654', 'Vinogradniška 2',   '1961-01-12', 'veteran',   'višji gasilski častnik',    'SV-013', '1980-05-30', 'available'),
  ('tomaz.rupnik',    'tomaz.rupnik@pgd.si',      'Tomaž',    'Rupnik',    '040 567 543', 'Pri cerkvi 1',      '1968-03-08', 'veteran',   'gasilski častnik',          'SV-014', '1987-09-19', 'unavailable'),
  ('eva.kos',         'eva.kos@pgd.si',           'Eva',      'Kos',       '051 678 432', 'Šolska 14',         '2008-04-22', 'youth',     NULL,                        'SV-015', '2021-09-01', 'available'),
  ('nejc.lah',        'nejc.lah@pgd.si',          'Nejc',     'Lah',       '031 789 321', 'Rožna dolina 6',    '2009-11-16', 'youth',     NULL,                        'SV-016', '2022-09-01', 'available'),
  ('zala.kavcic',     'zala.kavcic@pgd.si',       'Zala',     'Kavčič',    '040 890 210', 'Prešernova 23',     '2010-02-27', 'youth',     NULL,                        'SV-017', '2023-09-01', 'at_home'),
  ('gasper.novak',    'gasper.novak@pgd.si',      'Gašper',   'Novak',     '041 901 109', 'Slomškova 4',       '2004-06-14', 'trainee',   'gasilec pripravnik',        'SV-018', '2024-02-10', 'available'),
  ('barbara.svetlin', 'barbara.svetlin@pgd.si',   'Barbara',  'Svetlin',   '051 012 098', 'Ulica bratov 17',   '1970-12-01', 'support',   NULL,                        'SV-019', '2001-04-25', 'available'),
  ('ivan.pavlin',     'ivan.pavlin@pgd.si',       'Ivan',     'Pavlin',    '031 123 456', 'Kolodvorska 30',    '1955-08-18', 'honorary',  'gasilski častnik',          'SV-020', '1974-03-11', 'at_home')
) AS u(username, email, first_name, last_name, phone, address, dob, status, rank, member_no, joined, avail);

-- ── Vloge ────────────────────────────────────────────────────────────────────
INSERT INTO user_roles (user_id, organization_id, role)
SELECT us.id, us.organization_id, r.role::system_role
FROM users us
JOIN (VALUES
  ('demo', 'org_admin'), ('demo', 'president'),
  ('marko.kovac', 'commander'),
  ('peter.mlakar', 'deputy_commander'),
  ('ana.horvat', 'secretary'),
  ('spela.turk', 'treasurer'),
  ('jure.vidmar', 'chief_machinist'),
  ('rok.zajc', 'toolkeeper'),
  ('katja.golob', 'youth_mentor'),
  ('luka.krajnc', 'assistant_breathing_apparatus'),
  ('nina.potocnik', 'assistant_first_aid'),
  ('miha.oblak', 'assistant_communications'),
  ('david.hribar', 'board_member'),
  ('franc.bizjak', 'supervisory_board_member')
) AS r(username, role) ON r.username = us.username
WHERE us.organization_id = '0de00000-0000-4000-8000-000000000001';

-- vsi ostali so navadni člani
INSERT INTO user_roles (user_id, organization_id, role)
SELECT id, organization_id, 'member'::system_role
FROM users
WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
  AND username NOT IN ('demo');

-- ── Vozila ───────────────────────────────────────────────────────────────────
INSERT INTO vehicles (id, organization_id, name, vehicle_type, license_plate, vin, year, mileage,
                      registration_expires, insurance_expires, service_due, service_mileage, notes)
VALUES
  ('0de00000-0000-4000-8000-000000000101', '0de00000-0000-4000-8000-000000000001',
   'MAN TGM 13.290', 'GVC-2', 'MB SV-101', 'WMAN12ZZ9KY123456', 2019, 38420,
   CURRENT_DATE + 9, CURRENT_DATE + 118, CURRENT_DATE + 24, 45000,
   'Cisterna 3000 l, vgrajena črpalka 2400 l/min.'),
  ('0de00000-0000-4000-8000-000000000102', '0de00000-0000-4000-8000-000000000001',
   'Mercedes Sprinter 519', 'GVM-1', 'MB SV-102', 'WDB90663325123789', 2021, 21870,
   CURRENT_DATE + 143, CURRENT_DATE + 27, CURRENT_DATE + 96, 30000,
   'Moštvo 1+8, prostor za dihalne aparate.'),
  ('0de00000-0000-4000-8000-000000000103', '0de00000-0000-4000-8000-000000000001',
   'Land Rover Defender', 'GVGP-1', 'MB SV-103', 'SALLDVBP7AA123321', 2012, 96540,
   CURRENT_DATE + 61, CURRENT_DATE + 61, CURRENT_DATE + 4, 100000,
   'Gozdni požari, visokotlačna črpalka.'),
  ('0de00000-0000-4000-8000-000000000104', '0de00000-0000-4000-8000-000000000001',
   'Škoda Kodiaq', 'PV-1', 'MB SV-104', 'TMBJG7NS0K8123654', 2020, 54210,
   CURRENT_DATE + 201, CURRENT_DATE + 174, CURRENT_DATE + 51, 60000,
   'Poveljniško vozilo, radijska postaja.'),
  ('0de00000-0000-4000-8000-000000000105', '0de00000-0000-4000-8000-000000000001',
   'Iveco Daily 70C', 'GVV-1', 'MB SV-105', 'ZCFC70A2005123147', 2016, 71230,
   CURRENT_DATE + 88, CURRENT_DATE + 88, CURRENT_DATE + 168, 80000,
   'Voda 800 l, tehnično reševanje.'),
  ('0de00000-0000-4000-8000-000000000106', '0de00000-0000-4000-8000-000000000001',
   'Priklopnik za motorno brizgalno', 'PMB', 'MB SV-106', NULL, 2008, 0,
   CURRENT_DATE + 312, CURRENT_DATE + 312, NULL, NULL,
   'Rosenbauer Fox III.');

INSERT INTO vehicle_drivers (vehicle_id, user_id)
SELECT v.id, us.id
FROM vehicles v
JOIN (VALUES
  ('0de00000-0000-4000-8000-000000000101', 'jure.vidmar'),
  ('0de00000-0000-4000-8000-000000000101', 'marko.kovac'),
  ('0de00000-0000-4000-8000-000000000101', 'peter.mlakar'),
  ('0de00000-0000-4000-8000-000000000102', 'luka.krajnc'),
  ('0de00000-0000-4000-8000-000000000102', 'rok.zajc'),
  ('0de00000-0000-4000-8000-000000000103', 'miha.oblak'),
  ('0de00000-0000-4000-8000-000000000103', 'jure.vidmar'),
  ('0de00000-0000-4000-8000-000000000104', 'marko.kovac'),
  ('0de00000-0000-4000-8000-000000000104', 'demo'),
  ('0de00000-0000-4000-8000-000000000105', 'spela.turk'),
  ('0de00000-0000-4000-8000-000000000105', 'luka.krajnc')
) AS d(vehicle_id, username) ON d.vehicle_id::uuid = v.id
JOIN users us ON us.username = d.username
             AND us.organization_id = '0de00000-0000-4000-8000-000000000001';

-- ── Dogodki ──────────────────────────────────────────────────────────────────
INSERT INTO events (id, organization_id, created_by, title, description, location, event_type,
                    starts_at, ends_at, requires_rsvp, send_notification, reminder_offsets, is_cancelled)
SELECT e.id::uuid, '0de00000-0000-4000-8000-000000000001', a.id, e.title, e.descr, e.loc,
       e.etype::event_type,
       (CURRENT_DATE + e.day_off) + e.tod::time,
       (CURRENT_DATE + e.day_off) + e.tod_end::time,
       e.rsvp, true, '[1440, 120]'::jsonb, e.cancelled
FROM users a, (VALUES
  -- pretekli dogodki (za statistiko udeležbe)
  ('0de00000-0000-4000-8000-000000000201', 'Redna operativna vaja — notranji napad', 'Vaja z dihalnimi aparati v vadbenem kontejnerju. Obvezna zaščitna oprema.', 'Gasilski dom Sončni Vrh', 'drill',        -34, '18:00', '20:30', true,  false),
  ('0de00000-0000-4000-8000-000000000202', 'Občni zbor društva',                     'Poročilo o delu za preteklo leto, načrt dela, volitve nadzornega odbora.',   'Dvorana gasilskega doma', 'assembly',    -27, '18:00', '21:00', true,  false),
  ('0de00000-0000-4000-8000-000000000203', 'Intervencija — požar v naravi',          'Požar suhe trave ob železniški progi, sodelovali dve enoti.',                'Ob progi, Sončni Vrh',    'intervention', -19, '14:20', '17:40', false, false),
  ('0de00000-0000-4000-8000-000000000204', 'Vaja z motorno brizgalno',               'Črpanje iz odprtega vodnega vira, postavitev napadalne proge B/C.',         'Ribnik pri mlinu',        'drill',        -12, '18:00', '20:00', true,  false),
  ('0de00000-0000-4000-8000-000000000205', 'Čiščenje in pregled opreme',             'Redni mesečni pregled dihalnih aparatov in cevi.',                           'Garaža gasilskega doma',  'cleanup',       -5, '17:00', '19:00', true,  false),
  -- prihodnji dogodki (odštevanje: danes / jutri / čez N dni)
  ('0de00000-0000-4000-8000-000000000206', 'Operativna vaja — tehnično reševanje',   'Reševanje iz vozila s hidravličnim orodjem. Vodi poveljnik Kovač.',          'Parkirišče za domom',     'drill',          0, '18:30', '20:30', true,  false),
  ('0de00000-0000-4000-8000-000000000207', 'Sestanek poveljstva',                    'Priprava na regijsko tekmovanje, razpored dežurstev čez poletje.',           'Sejna soba',              'meeting',        1, '19:00', '20:30', true,  false),
  ('0de00000-0000-4000-8000-000000000208', 'Vaja mladine',                           'Vaja z vedrovko in štafeta za mlade gasilce.',                               'Igrišče pri šoli',        'drill',          3, '17:00', '18:30', true,  false),
  ('0de00000-0000-4000-8000-000000000209', 'Gasilsko tekmovanje GZ Maribor',         'Regijsko tekmovanje članov A in B. Zbor ob 7.30 pred domom.',                'Športni park Maribor',    'competition',    9, '08:00', '16:00', true,  false),
  ('0de00000-0000-4000-8000-000000000210', 'Dan odprtih vrat',                       'Predstavitev vozil in opreme za občane, prikazna vaja ob 11.00.',            'Gasilski dom Sončni Vrh', 'celebration',   18, '10:00', '15:00', true,  false),
  ('0de00000-0000-4000-8000-000000000211', 'Operativni dan — pregled hidrantov',     'Pregled in evidentiranje hidrantnega omrežja v naselju.',                    'Naselje Sončni Vrh',      'operative_day', 30, '08:00', '13:00', true,  false),
  ('0de00000-0000-4000-8000-000000000212', 'Vaja z GZ — odpovedana',                 'Odpovedano zaradi napovedanega neurja, nov termin sporočimo naknadno.',      'Vadbeni poligon',         'drill',         12, '18:00', '20:00', true,  true)
) AS e(id, title, descr, loc, etype, day_off, tod, tod_end, rsvp, cancelled)
WHERE a.username = 'demo' AND a.organization_id = '0de00000-0000-4000-8000-000000000001';

-- Odzivi na prihodnje dogodke (večina se udeleži, nekaj ne)
INSERT INTO event_rsvps (event_id, user_id, status, note)
SELECT ev.id, us.id,
       (CASE (row_number() OVER (PARTITION BY ev.id ORDER BY us.username)) % 7
          WHEN 0 THEN 'not_attending'
          WHEN 3 THEN 'maybe'
          WHEN 5 THEN 'late'
          ELSE 'attending' END)::rsvp_status,
       (CASE (row_number() OVER (PARTITION BY ev.id ORDER BY us.username)) % 7
          WHEN 0 THEN 'Službene obveznosti.'
          WHEN 5 THEN 'Pridem 15 minut kasneje.'
          ELSE NULL END)
FROM events ev
JOIN users us ON us.organization_id = ev.organization_id
WHERE ev.organization_id = '0de00000-0000-4000-8000-000000000001'
  AND ev.starts_at >= NOW()
  AND ev.is_cancelled = false
  AND us.membership_status IN ('operative', 'trainee');

-- Prisotnost na preteklih dogodkih
INSERT INTO event_attendance (event_id, user_id, present, marked_by, marked_at)
SELECT ev.id, us.id,
       (row_number() OVER (PARTITION BY ev.id ORDER BY us.username)) % 6 <> 0,
       (SELECT id FROM users WHERE username = 'marko.kovac'
          AND organization_id = '0de00000-0000-4000-8000-000000000001'),
       ev.starts_at + INTERVAL '2 hours'
FROM events ev
JOIN users us ON us.organization_id = ev.organization_id
WHERE ev.organization_id = '0de00000-0000-4000-8000-000000000001'
  AND ev.starts_at < NOW()
  AND us.membership_status IN ('operative', 'trainee', 'veteran');

-- ── Oprema ───────────────────────────────────────────────────────────────────
INSERT INTO equipment (id, organization_id, vehicle_id, name, category, inventory_number, location,
                       condition, last_inspection, next_inspection, expiry_date, purchase_date,
                       qr_code, notes)
SELECT q.id::uuid, '0de00000-0000-4000-8000-000000000001', q.vehicle_id::uuid, q.name, q.cat, q.inv, q.loc,
       q.cond::equipment_condition,
       CASE WHEN q.last_insp IS NULL THEN NULL ELSE CURRENT_DATE + q.last_insp END,
       CASE WHEN q.next_insp IS NULL THEN NULL ELSE CURRENT_DATE + q.next_insp END,
       CASE WHEN q.expiry   IS NULL THEN NULL ELSE CURRENT_DATE + q.expiry   END,
       q.purchased::date, q.qr, q.notes
FROM (VALUES
  ('0de00000-0000-4000-8000-000000000301', '0de00000-0000-4000-8000-000000000101', 'Dihalni aparat Dräger PSS 4000 #1', 'Dihalna tehnika', 'IDA-001', 'GVC-2, omara levo',  'excellent', -170, 190,  NULL, '2019-04-12', 'PLM-IDA-001', 'Redni servis pri pooblaščenem servisu.'),
  ('0de00000-0000-4000-8000-000000000302', '0de00000-0000-4000-8000-000000000101', 'Dihalni aparat Dräger PSS 4000 #2', 'Dihalna tehnika', 'IDA-002', 'GVC-2, omara levo',  'good',      -170, 190,  NULL, '2019-04-12', 'PLM-IDA-002', NULL),
  ('0de00000-0000-4000-8000-000000000303', '0de00000-0000-4000-8000-000000000102', 'Dihalni aparat Dräger PSS 4000 #3', 'Dihalna tehnika', 'IDA-003', 'GVM-1, zadaj',       'good',      -200,  12,  NULL, '2019-04-12', 'PLM-IDA-003', 'Pregled zapade kmalu.'),
  ('0de00000-0000-4000-8000-000000000304', '0de00000-0000-4000-8000-000000000102', 'Dihalni aparat Dräger PSS 4000 #4', 'Dihalna tehnika', 'IDA-004', 'GVM-1, zadaj',       'fair',      -200,   3,  NULL, '2017-09-30', 'PLM-IDA-004', 'Predlog za zamenjavo v naslednjem letu.'),
  ('0de00000-0000-4000-8000-000000000305', NULL,                                   'Jeklenka 6,8 l — 300 bar #1',       'Dihalna tehnika', 'JEK-001', 'Skladišče, polica A','good',      -120, 240,   730, '2018-06-01', 'PLM-JEK-001', NULL),
  ('0de00000-0000-4000-8000-000000000306', NULL,                                   'Jeklenka 6,8 l — 300 bar #2',       'Dihalna tehnika', 'JEK-002', 'Skladišče, polica A','good',      -120, 240,    45, '2018-06-01', 'PLM-JEK-002', 'Rok tlačnega preizkusa se izteka.'),
  ('0de00000-0000-4000-8000-000000000307', NULL,                                   'Zaščitna obleka Texport Fire Ace',  'Zaščitna oprema', 'OBL-001', 'Garderoba, omarica 1','excellent',  -90, 275,  1460, '2022-03-15', 'PLM-OBL-001', NULL),
  ('0de00000-0000-4000-8000-000000000308', NULL,                                   'Zaščitna obleka Texport Fire Ace',  'Zaščitna oprema', 'OBL-002', 'Garderoba, omarica 2','good',       -90, 275,  1460, '2022-03-15', 'PLM-OBL-002', NULL),
  ('0de00000-0000-4000-8000-000000000309', NULL,                                   'Zaščitna obleka Rosenbauer Fire Max','Zaščitna oprema','OBL-003', 'Garderoba, omarica 3','good',       -90, 275,   120, '2016-05-20', 'PLM-OBL-003', 'Rok uporabnosti se izteče letos.'),
  ('0de00000-0000-4000-8000-000000000310', NULL,                                   'Čelada Rosenbauer Heros-Titan #1',  'Zaščitna oprema', 'CEL-001', 'Garderoba, omarica 1','excellent', -150, 215,  2190, '2021-02-10', 'PLM-CEL-001', NULL),
  ('0de00000-0000-4000-8000-000000000311', NULL,                                   'Čelada Rosenbauer Heros-Titan #2',  'Zaščitna oprema', 'CEL-002', 'Garderoba, omarica 2','good',      -150, 215,  2190, '2021-02-10', 'PLM-CEL-002', NULL),
  ('0de00000-0000-4000-8000-000000000312', NULL,                                   'Gasilski škornji Haix Fire Eagle',  'Zaščitna oprema', 'SKO-001', 'Garderoba, omarica 1','good',       NULL, NULL,  900, '2021-11-05', 'PLM-SKO-001', NULL),
  ('0de00000-0000-4000-8000-000000000313', '0de00000-0000-4000-8000-000000000101', 'Tlačna cev B75 — 20 m #1',          'Cevi',            'CEV-B01', 'GVC-2, predal 3',    'good',       -60, 305,  NULL, '2020-07-01', 'PLM-CEV-B01', NULL),
  ('0de00000-0000-4000-8000-000000000314', '0de00000-0000-4000-8000-000000000101', 'Tlačna cev B75 — 20 m #2',          'Cevi',            'CEV-B02', 'GVC-2, predal 3',    'fair',       -60, 305,  NULL, '2015-07-01', 'PLM-CEV-B02', 'Manjša poškodba ovoja, opazovati.'),
  ('0de00000-0000-4000-8000-000000000315', '0de00000-0000-4000-8000-000000000101', 'Tlačna cev C52 — 15 m #1',          'Cevi',            'CEV-C01', 'GVC-2, predal 4',    'good',       -60, 305,  NULL, '2020-07-01', 'PLM-CEV-C01', NULL),
  ('0de00000-0000-4000-8000-000000000316', '0de00000-0000-4000-8000-000000000101', 'Tlačna cev C52 — 15 m #2',          'Cevi',            'CEV-C02', 'GVC-2, predal 4',    'good',       -60, 305,  NULL, '2020-07-01', 'PLM-CEV-C02', NULL),
  ('0de00000-0000-4000-8000-000000000317', '0de00000-0000-4000-8000-000000000105', 'Sesalna cev A110 — 1,6 m',          'Cevi',            'CEV-A01', 'GVV-1, streha',      'good',       -60, 305,  NULL, '2016-04-11', 'PLM-CEV-A01', NULL),
  ('0de00000-0000-4000-8000-000000000318', '0de00000-0000-4000-8000-000000000105', 'Hidravlične škarje Weber RSU 200',  'Tehnično reševanje','TEH-001','GVV-1, predal 1',    'excellent',  -80, 285,  NULL, '2021-09-14', 'PLM-TEH-001', 'Letni servis opravljen.'),
  ('0de00000-0000-4000-8000-000000000319', '0de00000-0000-4000-8000-000000000105', 'Razpiralo Weber SP 49',             'Tehnično reševanje','TEH-002','GVV-1, predal 1',    'excellent',  -80, 285,  NULL, '2021-09-14', 'PLM-TEH-002', NULL),
  ('0de00000-0000-4000-8000-000000000320', '0de00000-0000-4000-8000-000000000105', 'Hidravlična črpalka Weber E-Pump',  'Tehnično reševanje','TEH-003','GVV-1, predal 2',    'good',       -80,  18,  NULL, '2018-03-22', 'PLM-TEH-003', NULL),
  ('0de00000-0000-4000-8000-000000000321', '0de00000-0000-4000-8000-000000000103', 'Motorna žaga Stihl MS 261',         'Orodje',          'ORO-001', 'GVGP-1, zaboj',      'good',      -100,  26,  NULL, '2019-05-30', 'PLM-ORO-001', 'Zamenjati verigo pred sezono.'),
  ('0de00000-0000-4000-8000-000000000322', '0de00000-0000-4000-8000-000000000103', 'Potopna črpalka Mast TP 8/1',       'Črpalke',         'CRP-001', 'GVGP-1, prtljažnik', 'good',      -100, 260,  NULL, '2017-08-08', 'PLM-CRP-001', NULL),
  ('0de00000-0000-4000-8000-000000000323', NULL,                                   'Motorna brizgalna Rosenbauer Fox III','Črpalke',       'CRP-002', 'Priklopnik PMB',     'excellent',  -45, 320,  NULL, '2020-06-18', 'PLM-CRP-002', NULL),
  ('0de00000-0000-4000-8000-000000000324', '0de00000-0000-4000-8000-000000000104', 'Radijska postaja Motorola DP4400 #1','Zveze',          'ZVE-001', 'PV-1, konzola',      'good',       -30, 335,  NULL, '2022-01-20', 'PLM-ZVE-001', NULL),
  ('0de00000-0000-4000-8000-000000000325', '0de00000-0000-4000-8000-000000000101', 'Radijska postaja Motorola DP4400 #2','Zveze',          'ZVE-002', 'GVC-2, konzola',     'good',       -30, 335,  NULL, '2022-01-20', 'PLM-ZVE-002', NULL),
  ('0de00000-0000-4000-8000-000000000326', NULL,                                   'Termovizijska kamera Dräger UCF 9000','Tehnično reševanje','TEH-004','Skladišče, sef',   'excellent',  -20, 345,  NULL, '2023-04-04', 'PLM-TEH-004', 'Uporaba samo z evidenco zadolžitve.'),
  ('0de00000-0000-4000-8000-000000000327', NULL,                                   'Gasilnik CO2 5 kg',                 'Gasilna sredstva','GAS-001', 'Gasilski dom, vhod', 'good',       -35, 330,   365, '2021-10-01', 'PLM-GAS-001', NULL),
  ('0de00000-0000-4000-8000-000000000328', NULL,                                   'Gasilnik prah ABC 9 kg',            'Gasilna sredstva','GAS-002', 'Garaža',             'fair',       -35,   7,   180, '2016-10-01', 'PLM-GAS-002', 'Pregled zapade v tednu dni.'),
  ('0de00000-0000-4000-8000-000000000329', NULL,                                   'Reševalna vrv 30 m — statična',     'Reševanje z višin','VRV-001','Skladišče, polica C','good',       -55, 310,  1095, '2022-08-12', 'PLM-VRV-001', NULL),
  ('0de00000-0000-4000-8000-000000000330', NULL,                                   'Komplet prve pomoči — veliki',      'Prva pomoč',      'PP-001',  'GVM-1, predal',      'good',       -25, 160,    60, '2023-02-14', 'PLM-PP-001', 'Preveriti roke zdravil.')
) AS q(id, vehicle_id, name, cat, inv, loc, cond, last_insp, next_insp, expiry, purchased, qr, notes);

-- Odprte zadolžitve (kdo trenutno ima kateri kos)
INSERT INTO equipment_assignments (equipment_id, user_id, issued_at, issued_by, condition_at_issue, issue_notes)
SELECT a.eq::uuid, us.id, NOW() - (a.days_ago || ' days')::interval, ib.id,
       a.cond::equipment_condition, a.note
FROM (VALUES
  ('0de00000-0000-4000-8000-000000000307', 'ana.horvat',    28, 'excellent', 'Osebna zadolžitev.'),
  ('0de00000-0000-4000-8000-000000000308', 'luka.krajnc',   28, 'good',      'Osebna zadolžitev.'),
  ('0de00000-0000-4000-8000-000000000310', 'ana.horvat',    28, 'excellent', NULL),
  ('0de00000-0000-4000-8000-000000000311', 'luka.krajnc',   28, 'good',      NULL),
  ('0de00000-0000-4000-8000-000000000312', 'nina.potocnik', 14, 'good',      NULL),
  ('0de00000-0000-4000-8000-000000000324', 'marko.kovac',    9, 'good',      'Za čas dežurstva.'),
  ('0de00000-0000-4000-8000-000000000326', 'peter.mlakar',   3, 'excellent', 'Vaja notranji napad.')
) AS a(eq, username, days_ago, cond, note)
JOIN users us ON us.username = a.username
             AND us.organization_id = '0de00000-0000-4000-8000-000000000001'
JOIN users ib ON ib.username = 'rok.zajc'
             AND ib.organization_id = '0de00000-0000-4000-8000-000000000001';

-- Zaključene zadolžitve (zgodovina)
INSERT INTO equipment_assignments (equipment_id, user_id, issued_at, returned_at, issued_by, returned_by,
                                   condition_at_issue, condition_at_return, return_notes)
SELECT a.eq::uuid, us.id,
       NOW() - (a.from_days || ' days')::interval,
       NOW() - (a.to_days || ' days')::interval,
       kp.id, kp.id, a.c1::equipment_condition, a.c2::equipment_condition, a.note
FROM (VALUES
  ('0de00000-0000-4000-8000-000000000321', 'miha.oblak',  40, 33, 'good', 'good', 'Vrnjeno po vaji, veriga naostrena.'),
  ('0de00000-0000-4000-8000-000000000318', 'jure.vidmar', 22, 19, 'excellent', 'excellent', 'Uporaba na intervenciji.'),
  ('0de00000-0000-4000-8000-000000000326', 'marko.kovac', 30, 26, 'excellent', 'excellent', NULL),
  ('0de00000-0000-4000-8000-000000000301', 'spela.turk',  17, 12, 'excellent', 'good', 'Po uporabi opravljeno čiščenje.')
) AS a(eq, username, from_days, to_days, c1, c2, note)
JOIN users us ON us.username = a.username
             AND us.organization_id = '0de00000-0000-4000-8000-000000000001'
JOIN users kp ON kp.username = 'rok.zajc'
             AND kp.organization_id = '0de00000-0000-4000-8000-000000000001';

-- ── Usposabljanja ────────────────────────────────────────────────────────────
INSERT INTO trainings (organization_id, user_id, name, provider, completed_at, expires_at, notes)
SELECT '0de00000-0000-4000-8000-000000000001', us.id, t.name, t.provider,
       CURRENT_DATE + t.done, CASE WHEN t.exp IS NULL THEN NULL ELSE CURRENT_DATE + t.exp END, t.notes
FROM (VALUES
  ('demo',            'Vodja enote',                    'GZS — Izobraževalni center Ig',  -1420,  NULL, NULL),
  ('demo',            'Nosilec dihalnega aparata',      'GZ Maribor',                      -900,   240, NULL),
  ('marko.kovac',     'Vodja sektorja',                 'GZS — Izobraževalni center Ig',  -1100,  NULL, NULL),
  ('marko.kovac',     'Nosilec dihalnega aparata',      'GZ Maribor',                      -700,    38, 'Obnovitveni tečaj kmalu.'),
  ('marko.kovac',     'Tehnično reševanje ob nesrečah', 'GZS — Izobraževalni center Ig',   -520,   580, NULL),
  ('peter.mlakar',    'Vodja skupine',                  'GZ Maribor',                      -980,  NULL, NULL),
  ('peter.mlakar',    'Nosilec dihalnega aparata',      'GZ Maribor',                      -640,    95, NULL),
  ('ana.horvat',      'Nosilec dihalnega aparata',      'GZ Maribor',                      -410,   320, NULL),
  ('ana.horvat',      'Prva pomoč',                     'Rdeči križ Slovenije',            -300,   430, NULL),
  ('luka.krajnc',     'Nosilec dihalnega aparata',      'GZ Maribor',                      -380,   350, NULL),
  ('luka.krajnc',     'Uporaba motorne žage',           'GZ Maribor',                      -210,  1250, NULL),
  ('nina.potocnik',   'Gasilec pripravnik',             'GZ Maribor',                      -760,  NULL, NULL),
  ('nina.potocnik',   'Prva pomoč',                     'Rdeči križ Slovenije',            -150,   580, NULL),
  ('jure.vidmar',     'Strojnik',                       'GZS — Izobraževalni center Ig',   -880,   180, NULL),
  ('jure.vidmar',     'Vozniški izpit C kategorije',    'AMZS',                           -1600,   690, NULL),
  ('spela.turk',      'Nosilec dihalnega aparata',      'GZ Maribor',                      -420,    22, 'Obnoviti pred jesenjo.'),
  ('rok.zajc',        'Skladiščnik — vzdrževanje opreme','GZ Maribor',                     -260,  NULL, NULL),
  ('miha.oblak',      'Radijske zveze',                 'GZS — Izobraževalni center Ig',   -540,   190, NULL),
  ('miha.oblak',      'Nosilec dihalnega aparata',      'GZ Maribor',                      -600,   140, NULL),
  ('katja.golob',     'Mentor mladine',                 'GZS — Izobraževalni center Ig',   -330,   760, NULL),
  ('katja.golob',     'Prva pomoč',                     'Rdeči križ Slovenije',            -290,   440, NULL),
  ('david.hribar',    'Vodja enote',                    'GZS — Izobraževalni center Ig',  -2100,  NULL, NULL),
  ('franc.bizjak',    'Vodja enote',                    'GZS — Izobraževalni center Ig',  -3200,  NULL, NULL),
  ('gasper.novak',    'Gasilec pripravnik',             'GZ Maribor',                      -120,  NULL, NULL),
  ('tomaz.rupnik',    'Tehnično reševanje ob nesrečah', 'GZS — Izobraževalni center Ig',  -1800,  NULL, NULL)
) AS t(username, name, provider, done, exp, notes)
JOIN users us ON us.username = t.username
             AND us.organization_id = '0de00000-0000-4000-8000-000000000001';

-- ── Obvestila ────────────────────────────────────────────────────────────────
INSERT INTO notifications (id, organization_id, created_by, title, body, type, target, sent_at, created_at)
SELECT n.id::uuid, '0de00000-0000-4000-8000-000000000001', a.id, n.title, n.body, n.ntype,
       n.target::notification_target, NOW() - (n.hours || ' hours')::interval,
       NOW() - (n.hours || ' hours')::interval
FROM users a, (VALUES
  ('0de00000-0000-4000-8000-000000000401', 'Vaja nocoj ob 18.30',                'Danes izvedemo vajo tehničnega reševanja. Prinesite osebno zaščitno opremo, zbor pred domom ob 18.15.', 'general', 'operative',   3),
  ('0de00000-0000-4000-8000-000000000402', 'Zbiranje prijav za tekmovanje',      'Prijave za regijsko tekmovanje zbiramo do konca tedna. Javite se poveljniku ali potrdite udeležbo v aplikaciji.', 'general', 'all',        20),
  ('0de00000-0000-4000-8000-000000000403', 'Oprema s potekajočimi roki (3)',     'Gasilnik prah ABC 9 kg — pregled čez 7 dni; dihalni aparat #4 — pregled čez 3 dni; jeklenka JEK-002 — rok čez 45 dni.', 'equipment_reminder', 'leadership', 27),
  ('0de00000-0000-4000-8000-000000000404', 'Vozila s potekajočimi roki (2)',     'MAN TGM 13.290 — registracija poteče čez 9 dni; Land Rover Defender — servis čez 4 dni.', 'vehicle_reminder', 'leadership', 31),
  ('0de00000-0000-4000-8000-000000000405', 'Sestanek poveljstva jutri',          'Jutri ob 19.00 v sejni sobi. Tema: razpored poletnih dežurstev in priprava na tekmovanje.', 'general', 'leadership',  44),
  ('0de00000-0000-4000-8000-000000000406', 'Vaja mladine v soboto',              'Vaja z vedrovko in štafeta. Starše prosimo za prevoz do igrišča pri šoli.', 'general', 'youth',       50),
  ('0de00000-0000-4000-8000-000000000407', 'Hvala za udeležbo na čiščenju',      'Zahvala vsem, ki ste sodelovali pri pregledu opreme. Vsi dihalni aparati so pripravljeni za uporabo.', 'general', 'all',        68),
  ('0de00000-0000-4000-8000-000000000408', 'Opomnik: usposabljanje poteče',      'Obnovitveni tečaj za nosilce dihalnih aparatov je treba opraviti do konca meseca (Turk, Kovač).', 'training_reminder', 'leadership', 74),
  ('0de00000-0000-4000-8000-000000000409', 'SPIN: Požar v naravi — Maribor',     'Požar suhe trave ob železniški progi. Aktivirani PGD Sončni Vrh in PGD Maribor mesto.', 'spin', 'operative',   96),
  ('0de00000-0000-4000-8000-000000000410', 'Občni zbor — zapisnik objavljen',    'Zapisnik občnega zbora je na voljo med dokumenti. Pripombe sprejemamo 8 dni.', 'general', 'all',       140),
  ('0de00000-0000-4000-8000-000000000411', 'SPIN: Prometna nesreča — Maribor',   'Prometna nesreča na obvoznici, poškodovana ena oseba. Posredovali gasilci in NMP.', 'spin', 'operative',  168),
  ('0de00000-0000-4000-8000-000000000412', 'Nova zaščitna oprema',               'Prevzeli smo tri nove zaščitne obleke. Zadolžitev opreme urejamo prek aplikacije (QR/NFC).', 'general', 'all',       210)
) AS n(id, title, body, ntype, target, hours)
WHERE a.username = 'demo' AND a.organization_id = '0de00000-0000-4000-8000-000000000001';

-- Starejša obvestila so prebrana; zadnja tri ostanejo neprebrana (značka v aplikaciji)
INSERT INTO notification_reads (notification_id, user_id, read_at)
SELECT n.id, us.id, n.created_at + INTERVAL '2 hours'
FROM notifications n
JOIN users us ON us.organization_id = n.organization_id
WHERE n.organization_id = '0de00000-0000-4000-8000-000000000001'
  AND n.created_at < NOW() - INTERVAL '40 hours';

-- ── Dokumenti ────────────────────────────────────────────────────────────────
INSERT INTO documents (organization_id, uploaded_by, name, category, file_url, file_size, mime_type, is_public)
SELECT '0de00000-0000-4000-8000-000000000001', a.id, d.name, d.cat, d.url, d.size, d.mime, true
FROM users a, (VALUES
  ('Zapisnik občnega zbora.pdf',        'Zapisniki',  'uploads/demo/zapisnik-obcni-zbor.pdf',   248320, 'application/pdf'),
  ('Pravila društva.pdf',               'Pravilniki', 'uploads/demo/pravila-drustva.pdf',       412880, 'application/pdf'),
  ('Načrt dela 2026.pdf',               'Načrti',     'uploads/demo/nacrt-dela-2026.pdf',       186540, 'application/pdf'),
  ('Razpored dežurstev — poletje.pdf',  'Razporedi',  'uploads/demo/razpored-dezurstev.pdf',     94210, 'application/pdf'),
  ('Seznam hidrantov.pdf',              'Operativa',  'uploads/demo/seznam-hidrantov.pdf',      321470, 'application/pdf'),
  ('Poročilo o intervenciji 19-07.pdf', 'Poročila',   'uploads/demo/porocilo-19-07.pdf',        112060, 'application/pdf')
) AS d(name, cat, url, size, mime)
WHERE a.username = 'demo' AND a.organization_id = '0de00000-0000-4000-8000-000000000001';

COMMIT;

-- Povzetek
SELECT 'člani' AS kaj, count(*) FROM users WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'dogodki', count(*) FROM events WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'odzivi', count(*) FROM event_rsvps r JOIN events e ON e.id = r.event_id WHERE e.organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'prisotnost', count(*) FROM event_attendance a JOIN events e ON e.id = a.event_id WHERE e.organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'vozila', count(*) FROM vehicles WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'oprema', count(*) FROM equipment WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'zadolžitve', count(*) FROM equipment_assignments ea JOIN equipment eq ON eq.id = ea.equipment_id WHERE eq.organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'usposabljanja', count(*) FROM trainings WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'obvestila', count(*) FROM notifications WHERE organization_id = '0de00000-0000-4000-8000-000000000001'
UNION ALL SELECT 'dokumenti', count(*) FROM documents WHERE organization_id = '0de00000-0000-4000-8000-000000000001';
