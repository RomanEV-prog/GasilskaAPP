-- GasilApp — PostgreSQL Schema
-- Zaženi: psql -U postgres -d gasilapp -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  address       VARCHAR(255),
  city          VARCHAR(100),
  postal_code   VARCHAR(20),
  phone         VARCHAR(50),
  email         VARCHAR(255),
  website       VARCHAR(255),
  logo_url      VARCHAR(500),
  settings      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE membership_status AS ENUM ('operative','veteran','youth','trainee','support','honorary');
CREATE TYPE availability_status AS ENUM ('available','at_home','at_work','on_leave','sick','unavailable');
CREATE TYPE system_role AS ENUM ('super_admin','org_admin','president','commander','secretary','treasurer','youth_mentor','member');
CREATE TYPE event_type AS ENUM ('drill','meeting','competition','intervention','cleanup','celebration','assembly','other');
CREATE TYPE rsvp_status AS ENUM ('attending','not_attending','maybe','late');
CREATE TYPE vehicle_type AS ENUM ('gvc','gvgp','ac','pv','van','other');
CREATE TYPE equipment_condition AS ENUM ('excellent','good','fair','poor','out_of_service');
CREATE TYPE notification_target AS ENUM ('all','operative','youth','leadership','specific');

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username              VARCHAR(100) NOT NULL,
  email                 VARCHAR(255),
  password_hash         VARCHAR(255) NOT NULL,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  phone                 VARCHAR(50),
  address               VARCHAR(255),
  city                  VARCHAR(100),
  date_of_birth         DATE,
  photo_url             VARCHAR(500),
  membership_status     membership_status DEFAULT 'operative',
  rank                  VARCHAR(50),
  membership_number     VARCHAR(50),
  joined_at             DATE,
  is_active             BOOLEAN DEFAULT true,
  availability          availability_status DEFAULT 'available',
  fcm_token             VARCHAR(500),
  last_login_at         TIMESTAMPTZ,
  email_verified_at     TIMESTAMPTZ,
  password_reset_token  VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email),
  UNIQUE(organization_id, username)
);

CREATE TABLE user_roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            system_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id, role)
);

CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES users(id),
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  location          VARCHAR(255),
  event_type        event_type NOT NULL DEFAULT 'other',
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  target_group      membership_status[],
  requires_rsvp     BOOLEAN DEFAULT true,
  send_notification BOOLEAN DEFAULT true,
  reminder_minutes  INTEGER DEFAULT 60,
  is_cancelled      BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      rsvp_status NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE event_attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  present     BOOLEAN DEFAULT false,
  marked_by   UUID REFERENCES users(id),
  marked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE vehicles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  vehicle_type          vehicle_type NOT NULL,
  license_plate         VARCHAR(20),
  vin                   VARCHAR(50),
  year                  INTEGER,
  mileage               INTEGER DEFAULT 0,
  registration_expires  DATE,
  insurance_expires     DATE,
  service_due           DATE,
  service_mileage       INTEGER,
  notes                 TEXT,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicle_drivers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, user_id)
);

CREATE TABLE equipment (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  name                VARCHAR(255) NOT NULL,
  category            VARCHAR(100),
  inventory_number    VARCHAR(100),
  location            VARCHAR(255),
  condition           equipment_condition DEFAULT 'good',
  last_inspection     DATE,
  next_inspection     DATE,
  notes               TEXT,
  qr_code             VARCHAR(255) UNIQUE,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trainings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  provider          VARCHAR(255),
  completed_at      DATE NOT NULL,
  expires_at        DATE,
  document_url      VARCHAR(500),
  notes             TEXT,
  reminder_sent     BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES users(id),
  title             VARCHAR(255) NOT NULL,
  body              TEXT NOT NULL,
  type              VARCHAR(50) DEFAULT 'general',
  target            notification_target DEFAULT 'all',
  target_user_ids   UUID[],
  data              JSONB DEFAULT '{}',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_reads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  file_url        VARCHAR(500) NOT NULL,
  file_size       INTEGER,
  mime_type       VARCHAR(100),
  is_public       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(50) NOT NULL,
  entity          VARCHAR(100) NOT NULL,
  entity_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_avail ON users(organization_id, availability, membership_status);
CREATE INDEX idx_events_org ON events(organization_id, starts_at);
CREATE INDEX idx_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_attendance_event ON event_attendance(event_id);
CREATE INDEX idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX idx_vehicles_exp ON vehicles(registration_expires, insurance_expires, service_due);
CREATE INDEX idx_trainings_user ON trainings(user_id, expires_at);
CREATE INDEX idx_trainings_org ON trainings(organization_id, expires_at);
CREATE INDEX idx_notif_org ON notifications(organization_id, created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER t_orgs BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_vehicles BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_equipment BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_trainings BEFORE UPDATE ON trainings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_docs BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
