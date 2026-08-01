-- Data/hora de captura exibida na biblioteca de fotos (complementa taken_at date-only).

alter table clinic.photos
  add column if not exists captured_at timestamptz;

comment on column clinic.photos.captured_at is
  'Momento de captura escolhido no upload (biblioteca). Exibição: captured_at ?? created_at.';

create index if not exists photos_client_captured_at_idx
  on clinic.photos (client_id, captured_at desc nulls last);
