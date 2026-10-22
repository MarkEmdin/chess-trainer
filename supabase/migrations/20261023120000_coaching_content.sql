-- Inline-editor messages (spec 011): text with move chips, the lines they
-- come from and drawings, as one JSON document. `body` keeps the plain-text
-- rendering for previews and the length limit. Shape and legality are
-- validated in the server actions; the check only guards the JSON type.
-- Existing insert/select policies cover the new column.
alter table public.coaching_requests
  add column content jsonb
  check (content is null or jsonb_typeof(content) = 'object');

alter table public.coaching_responses
  add column content jsonb
  check (content is null or jsonb_typeof(content) = 'object');
