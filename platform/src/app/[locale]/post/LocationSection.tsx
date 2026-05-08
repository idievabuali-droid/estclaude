'use client';

import { useState } from 'react';
import { AppCard, AppCardContent, AppSelect } from '@/components/primitives';
import { AddressAutocomplete, type AddressPick } from './AddressAutocomplete';
import { LocationPicker } from './LocationPicker';
import { nearestDistrictId } from '@/lib/listings/nearest-district';

interface DistrictOption {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
}

export interface LocationSectionProps {
  /** Section heading + subtitle. New-building uses "Где находится ЖК",
   *  standalone uses "Где находится квартира" — same shape, different
   *  framing. */
  title: string;
  subtitle?: string;

  // ─── Address ──────────────────────────────────────────
  address: string;
  onAddressChange: (next: string) => void;
  addressFieldKey: string; // 'b.address' or 's.street_address'
  addressError?: string;

  // ─── District ─────────────────────────────────────────
  districts: DistrictOption[];
  districtId: string;
  onDistrictChange: (id: string) => void;
  districtFieldKey: string; // 'b.district_id' or 's.district_id'
  districtError?: string;

  // ─── Map pin ──────────────────────────────────────────
  coords: { lat: number; lng: number } | null;
  onCoordsChange: (next: { lat: number; lng: number }) => void;

  // ─── Optional: building pick fires this so PostFlow can
  //               auto-switch to existing-building mode. ──────
  onPickExistingBuilding?: (buildingId: string) => void;
}

/**
 * Single "Где находится" block that bundles address autocomplete + map
 * pin + district picker. Used at the TOP of both new-building and
 * standalone /post flows so the seller's first interaction is the one
 * thing they always know — where the apartment is.
 *
 * Wiring decisions:
 *
 *  - The autocomplete is the primary entry. Picking a building hit
 *    fires `onPickExistingBuilding` so the parent can flip mode (the
 *    seller picked an already-known ЖК; we shouldn't be creating a
 *    duplicate). Picking a district / POI updates coords + district
 *    here directly without bothering the parent.
 *
 *  - Free text + manual pin drop is a first-class path. Sellers in
 *    Vahdat often have addresses OSM has never seen — they just type
 *    "ул. Айни 14" and drag the marker. Auto-derived district fires
 *    after every coord change.
 *
 *  - Район dropdown is shown but auto-populated from coords. The
 *    seller can override (e.g. building right on a district boundary
 *    where the centroid math picked the wrong one).
 */
export function LocationSection({
  title,
  subtitle,
  address,
  onAddressChange,
  addressFieldKey,
  addressError,
  districts,
  districtId,
  onDistrictChange,
  districtFieldKey,
  districtError,
  coords,
  onCoordsChange,
  onPickExistingBuilding,
}: LocationSectionProps) {
  // The map's centerKey changes whenever the seller picks a district
  // OR an autocomplete suggestion. LocationPicker watches this to
  // recenter + reset the marker.
  const [centerKey, setCenterKey] = useState(districtId || 'init');
  const district = districts.find((d) => d.id === districtId) ?? districts[0];
  const centerLat = district?.center_lat ?? 38.5511;
  const centerLng = district?.center_lng ?? 69.0214;

  function handlePick(pick: AddressPick) {
    if (pick.kind === 'building') {
      // Hand off to PostFlow — it'll switch mode and pre-select the
      // building. We do NOT update coords / district here because the
      // form is about to flip out of standalone/new-building mode.
      if (onPickExistingBuilding) {
        onPickExistingBuilding(pick.buildingId);
      }
      return;
    }
    if (pick.kind === 'district' && pick.latitude != null && pick.longitude != null) {
      onDistrictChange(pick.districtId);
      onCoordsChange({ lat: pick.latitude, lng: pick.longitude });
      setCenterKey(pick.districtId);
      return;
    }
    if (pick.kind === 'poi') {
      onCoordsChange({ lat: pick.latitude, lng: pick.longitude });
      // Snap district to whichever centroid is closest to the POI —
      // the picker's POI doesn't carry district_id directly, only the
      // human district slug.
      const snapped = nearestDistrictId(pick.latitude, pick.longitude, districts);
      if (snapped && snapped !== districtId) {
        onDistrictChange(snapped);
        setCenterKey(snapped);
      } else {
        // Force LocationPicker to recenter on the new coords even when
        // the district didn't change — bump the key with a fresh value.
        setCenterKey(`poi-${pick.latitude.toFixed(4)}-${pick.longitude.toFixed(4)}`);
      }
      return;
    }
    // 'free' — seller pressed Enter / clicked "use as typed". No
    // location change; they'll drop the pin manually next.
  }

  function handleCoordsChange(next: { lat: number; lng: number }) {
    onCoordsChange(next);
    // Auto-snap district to whatever centroid is closest to the new
    // pin position. Cheap (≤10 districts in V1). Seller can override
    // via the dropdown below.
    const snapped = nearestDistrictId(next.lat, next.lng, districts);
    if (snapped && snapped !== districtId) {
      onDistrictChange(snapped);
    }
  }

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 font-semibold text-stone-900">{title}</h2>
            {subtitle ? (
              <p className="text-meta text-stone-500">{subtitle}</p>
            ) : null}
          </div>

          <AddressAutocomplete
            label="Адрес"
            required
            value={address}
            onChange={onAddressChange}
            onPick={handlePick}
            placeholder="ул. Айни 14, или название ЖК / ориентир"
            helperText="Начните вводить — подскажем известные ЖК и ориентиры. Можно вписать адрес и поставить метку вручную."
            errorText={addressError}
            fieldKey={addressFieldKey}
          />

          <div data-field-key={districtFieldKey}>
            <AppSelect
              label="Район"
              required
              value={districtId}
              onChange={(e) => {
                onDistrictChange(e.target.value);
                setCenterKey(e.target.value);
              }}
              options={districts.map((d) => ({ value: d.id, label: d.name }))}
              helperText="Подбираем автоматически по точке на карте — поправьте, если выбрано неточно."
              errorText={districtError}
            />
          </div>

          <LocationPicker
            centerLat={centerLat}
            centerLng={centerLng}
            centerKey={centerKey}
            value={coords}
            onChange={handleCoordsChange}
          />
        </div>
      </AppCardContent>
    </AppCard>
  );
}
