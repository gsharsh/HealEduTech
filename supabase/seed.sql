-- Public-domain sample catalogue for local development and demos.
--
-- Supabase runs supabase/seed.sql after migrations during `supabase start`
-- and `supabase db reset`. Keep this file to data-only statements.
--
-- Attribution and licensing notes:
-- - All listed source records are Project Gutenberg entries marked
--   "Public domain in the USA." Their catalogue metadata is distributed under
--   CC0 1.0. Source records were checked on 2026-09-17.
-- - No remote cover images are stored or hotlinked here.
-- - Vietnamese titles/descriptions are local catalogue summaries, not official
--   published translations.
--
-- Sources:
-- - The Tale of Peter Rabbit, Beatrix Potter:
--   https://www.gutenberg.org/ebooks/14838
-- - The Velveteen Rabbit, Margery Williams Bianco:
--   https://www.gutenberg.org/ebooks/11757
-- - The Burgess Bird Book for Children, Thornton W. Burgess:
--   https://www.gutenberg.org/ebooks/3074
-- - Book about Animals, Rufus Merrill:
--   https://www.gutenberg.org/ebooks/10737
-- - Spiders, Cecil Warburton:
--   https://www.gutenberg.org/ebooks/44496
-- - A Child's Garden of Verses, Robert Louis Stevenson:
--   https://www.gutenberg.org/ebooks/136

with seed_books (
  id, title_en, title_vi, author, language, topic, description_en, description_vi, created_at
) as (
  values
    (
      '31000000-0000-4000-8000-000000000001'::uuid,
      'The Tale of Peter Rabbit',
      'Chuyện về chú thỏ Peter',
      'Beatrix Potter',
      'en',
      'stories',
      'A mischievous young rabbit slips into Mr. McGregor''s garden and learns why listening matters.',
      'Câu chuyện về một chú thỏ tinh nghịch lẻn vào khu vườn của ông McGregor và học vì sao cần biết lắng nghe.',
      '2026-09-17 00:00:00+00'::timestamptz
    ),
    (
      '31000000-0000-4000-8000-000000000002'::uuid,
      'The Velveteen Rabbit',
      'Chú thỏ nhung',
      'Margery Williams Bianco',
      'en',
      'stories',
      'A toy rabbit discovers love, friendship, and what it means to become real.',
      'Một chú thỏ đồ chơi khám phá tình yêu thương, tình bạn và ý nghĩa của việc trở nên thật.',
      '2026-09-17 00:00:00+00'::timestamptz
    ),
    (
      '31000000-0000-4000-8000-000000000003'::uuid,
      'The Burgess Bird Book for Children',
      'Sách về chim của Burgess cho trẻ em',
      'Thornton W. Burgess',
      'en',
      'nature',
      'A friendly introduction to birds, their habits, and how young readers can notice them outdoors.',
      'Lời giới thiệu gần gũi về các loài chim, tập tính của chúng và cách trẻ quan sát chim ngoài trời.',
      '2026-09-17 00:00:00+00'::timestamptz
    ),
    (
      '31000000-0000-4000-8000-000000000004'::uuid,
      'Book about Animals',
      'Sách về động vật',
      'Rufus Merrill',
      'en',
      'nature',
      'Short illustrated readings about animals including elephants, rabbits, antelopes, and polar bears.',
      'Những bài đọc ngắn về động vật như voi, thỏ, linh dương và gấu trắng Bắc Cực.',
      '2026-09-17 00:00:00+00'::timestamptz
    ),
    (
      '31000000-0000-4000-8000-000000000005'::uuid,
      'Spiders',
      'Nhện',
      'Cecil Warburton',
      'en',
      'science',
      'A natural science text about spider habits, webs, and close observation of small creatures.',
      'Một sách khoa học tự nhiên về tập tính của nhện, mạng nhện và cách quan sát những sinh vật nhỏ.',
      '2026-09-17 00:00:00+00'::timestamptz
    ),
    (
      '31000000-0000-4000-8000-000000000006'::uuid,
      'A Child''s Garden of Verses',
      'Khu vườn thơ của trẻ em',
      'Robert Louis Stevenson',
      'en',
      'stories',
      'Classic poems that invite children to imagine gardens, play, travel, and everyday wonder.',
      'Tập thơ cổ điển gợi mở trí tưởng tượng của trẻ về khu vườn, trò chơi, chuyến đi và những điều kỳ diệu hằng ngày.',
      '2026-09-17 00:00:00+00'::timestamptz
    )
)
insert into public.books (
  id, title_en, title_vi, author, language, topic, description_en, description_vi, created_at
)
select id, title_en, title_vi, author, language, topic, description_en, description_vi, created_at
from seed_books
on conflict (id) do update
set title_en = excluded.title_en,
    title_vi = excluded.title_vi,
    author = excluded.author,
    language = excluded.language,
    topic = excluded.topic,
    description_en = excluded.description_en,
    description_vi = excluded.description_vi;

with seed_copies (id, book_id, inventory_code, created_at) as (
  values
    ('32000000-0000-4000-8000-000000000001'::uuid, '31000000-0000-4000-8000-000000000001'::uuid, 'EVG-SEED-PETER-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000002'::uuid, '31000000-0000-4000-8000-000000000001'::uuid, 'EVG-SEED-PETER-002', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000003'::uuid, '31000000-0000-4000-8000-000000000001'::uuid, 'EVG-SEED-PETER-003', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000004'::uuid, '31000000-0000-4000-8000-000000000002'::uuid, 'EVG-SEED-VELVET-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000005'::uuid, '31000000-0000-4000-8000-000000000002'::uuid, 'EVG-SEED-VELVET-002', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000006'::uuid, '31000000-0000-4000-8000-000000000003'::uuid, 'EVG-SEED-BIRDS-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000007'::uuid, '31000000-0000-4000-8000-000000000003'::uuid, 'EVG-SEED-BIRDS-002', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000008'::uuid, '31000000-0000-4000-8000-000000000003'::uuid, 'EVG-SEED-BIRDS-003', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000009'::uuid, '31000000-0000-4000-8000-000000000004'::uuid, 'EVG-SEED-ANIMALS-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000010'::uuid, '31000000-0000-4000-8000-000000000004'::uuid, 'EVG-SEED-ANIMALS-002', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000011'::uuid, '31000000-0000-4000-8000-000000000005'::uuid, 'EVG-SEED-SPIDERS-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000012'::uuid, '31000000-0000-4000-8000-000000000005'::uuid, 'EVG-SEED-SPIDERS-002', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000013'::uuid, '31000000-0000-4000-8000-000000000006'::uuid, 'EVG-SEED-VERSES-001', '2026-09-17 00:00:00+00'::timestamptz),
    ('32000000-0000-4000-8000-000000000014'::uuid, '31000000-0000-4000-8000-000000000006'::uuid, 'EVG-SEED-VERSES-002', '2026-09-17 00:00:00+00'::timestamptz)
)
insert into public.book_copies (id, book_id, inventory_code, created_at)
select id, book_id, inventory_code, created_at
from seed_copies
on conflict (id) do update
set book_id = excluded.book_id,
    inventory_code = excluded.inventory_code;
