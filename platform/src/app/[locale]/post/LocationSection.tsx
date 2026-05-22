'use client';

import { useState } from 'react';
import { AppCard, AppCardContent, AppSelect } from '@/components/primitives';
import { AddressAutocomplete, type AddressPick } from './AddressAutocomplete';
import { LocationPicker, type LocationLandmark } from './LocationPicker';
import { nearestDistrictId } from '@/lib/listings/nearest-district';

interface DistrictOption {
  id: string;
  name: string;
  /** May fall back to Vahdat town-centre when the district seed row
   *  has no centroid in the DB. The map still renders correctly; the
   *  auto-derive logic skips districts whose centroid matches the
   *  fallback to avoid "every pin snaps to districts[0]". */
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

  // ─── Map landmark layer ────────────────────────────────
  landmarks?: LocationLandmark[];

  // ─── Optional: building pick fires this so PostFlow can
  //               auto-switch to existing-building mode. ──────
  onPickExistingBuilding?: (buildingId: string) => void;

  /** Optional callback — when provided, the district dropdown shows a
   *  "+ Создать новый район" option at the end. Tapping it fires this
   *  instead of `onDistrictChange`. PostFlow uses this to open the
   *  NewDistrictModal; the modal's onCreated then appends to the
   *  districts list and auto-selects the new id. */
  onCreateNewDistrict?: () => void;
}

/** Synthetic dropdown value — picked by the parent to open the new-
 *  district modal instead of selecting a real district. Same pattern
 *  as ADD_DEVELOPER_VALUE in PostFlow.tsx for the developer dropdown. */
const ADD_DISTRICT_VALUE = '__add_new_district__';

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
  landmarks,
  onPickExistingBuilding,
  onCreateNewDistrict,
}: LocationSectionProps) {
  // The point the map should fly to + use as the chosen marker
  // position whenever `key` changes. Tracked separately from the form's
  // `coords` because district-change-via-dropdown should reset the
  // marker to the district centroid, while POI picks should drop the
  // marker exactly on the POI (not the district fallback). The parent's
  // `coords` is the source of truth for the *form*; this `target` is
  // the source of truth for the *map view*.
  const [target, setTarget] = useState(() => {
    const initial = districts.find((d) => d.id === districtId) ?? districts[0];
    return {
      lat: coords?.lat ?? initial?.center_lat ?? 38.5511,
      lng: coords?.lng ?? initial?.center_lng ?? 69.0214,
      key: districtId || 'init',
    };
  });

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
      setTarget({ lat: pick.latitude, lng: pick.longitude, key: pick.districtId });
      return;
    }
    if (pick.kind === 'poi') {
      onCoordsChange({ lat: pick.latitude, lng: pick.longitude });
      // Snap district to whichever centroid is closest to the POI —
      // the picker's POI doesn't carry district_id directly, only the
      // human district slug. nearestDistrictId returns null if all
      // centroids share the Vahdat-fallback (so we don't blindly snap
      // to districts[0]).
      const snapped = nearestDistrictId(pick.latitude, pick.longitude, districts);
      if (snapped && snapped !== districtId) {
        onDistrictChange(snapped);
      }
      // Always recenter the map on the POI coords (NOT the district
      // centroid) so the seller sees the place they picked.
      setTarget({
        lat: pick.latitude,
        lng: pick.longitude,
        key: `poi-${pick.latitude.toFixed(4)}-${pick.longitude.toFixed(4)}`,
      });
      return;
    }
    // 'free' — seller pressed Enter / clicked "use as typed". No
    // location change; they'll drop the pin manually next.
  }

  function handleCoordsChange(next: { lat: number; lng: number }) {
    onCoordsChange(next);
    // Auto-snap district to whatever centroid is closest to the new
    // pin position. Cheap (≤10 districts in V1). Seller can override
    // via the dropdown below. nearestDistrictId returns null when
    // centroid data is missing → we keep the seller's chosen district.
    const snapped = nearestDistrictId(next.lat, next.lng, districts);
    if (snapped && snapped !== districtId) {
      onDistrictChange(snapped);
    }
  }

  function handleDistrictChange(nextId: string) {
    onDistrictChange(nextId);
    const d = districts.find((dd) => dd.id === nextId);
    if (d) {
      // Reset the map view + marker to the new district's centroid.
      // The form's `coords` will follow via LocationPicker's centerKey
      // effect — switching район is the seller saying "ignore the old
      // pin, I'm somewhere else now."
      setTarget({ lat: d.center_lat, lng: d.center_lng, key: nextId });
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
                // Synthetic value opens the new-district modal instead
                // of selecting; we don't mutate districtId so the
                // dropdown bounces back to the prior selection while
                // the modal is open. Same pattern as ADD_DEVELOPER_VALUE.
                if (e.target.value === ADD_DISTRICT_VALUE) {
                  onCreateNewDistrict?.();
                  return;
                }
                handleDistrictChange(e.target.value);
              }}
              options={[
                ...districts.map((d) => ({ value: d.id, label: d.name })),
                ...(onCreateNewDistrict
                  ? [{ value: ADD_DISTRICT_VALUE, label: '+ Создать новый район' }]
                  : []),
              ]}
              helperText="Подбираем автоматически по точке на карте — поправьте, если выбрано неточно."
              errorText={districtError}
            />
          </div>

          <LocationPicker
            centerLat={target.lat}
            centerLng={target.lng}
            centerKey={target.key}
            value={coords}
            onChange={handleCoordsChange}
            landmarks={landmarks}
          />
        </div>
      </AppCardContent>
    </AppCard>
  );
}
