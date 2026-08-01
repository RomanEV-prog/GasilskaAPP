import { Select } from 'gasilapp-frontend';

export function ZOznako() {
  return (
    <div className="max-w-sm">
      <Select label="Vrsta dogodka" defaultValue="operativa">
        <option value="operativa">Operativna vaja</option>
        <option value="veselica">Veselica</option>
        <option value="obcni_zbor">Občni zbor</option>
        <option value="izobrazevanje">Izobraževanje</option>
      </Select>
    </div>
  );
}

export function ZNapako() {
  return (
    <div className="max-w-sm">
      <Select label="Vozilo" error="Izberite vozilo." defaultValue="">
        <option value="" disabled>
          — izberite —
        </option>
        <option value="gvc">GVC 16/25</option>
        <option value="gvm">GVM-1</option>
      </Select>
    </div>
  );
}
