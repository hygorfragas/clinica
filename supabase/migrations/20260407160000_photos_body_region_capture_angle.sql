-- Região do procedimento e ângulo de captura (obrigatório para compor base do boneco facial).

alter table clinic.photos
  add column if not exists body_region text not null default 'other',
  add column if not exists capture_angle text;

comment on column clinic.photos.body_region is
  'Região: face (boneco digital multi-ângulo), neck, torso, limbs, gluteal, other.';
comment on column clinic.photos.capture_angle is
  'Para face: front, left, right, top, bottom, custom. Outras regiões: null ou unspecified.';

alter table clinic.photos drop constraint if exists photos_body_region_chk;
alter table clinic.photos
  add constraint photos_body_region_chk check (
    body_region in ('face', 'neck', 'torso', 'limbs', 'gluteal', 'other')
  );

alter table clinic.photos drop constraint if exists photos_capture_angle_chk;
alter table clinic.photos
  add constraint photos_capture_angle_chk check (
    capture_angle is null
    or capture_angle in (
      'front',
      'left',
      'right',
      'top',
      'bottom',
      'custom',
      'unspecified'
    )
  );

create index if not exists photos_client_region_idx
  on clinic.photos (client_id, body_region);
