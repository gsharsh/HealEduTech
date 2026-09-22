-- Hosted data migration for the initial public-domain sample catalogue.
insert into public.books (id, title_en, title_vi, author, language, topic, description_en, description_vi, created_at) values
('31000000-0000-4000-8000-000000000001'::uuid, 'The Tale of Peter Rabbit', 'Chuyen ve chu tho Peter', 'Beatrix Potter', 'en', 'stories', 'A mischievous young rabbit slips into Mr. McGregor''s garden and learns why listening matters.', 'Cau chuyen ve mot chu tho tinh nghich len vao khu vuon cua ong McGregor va hoc vi sao can biet lang nghe.', '2026-09-17 00:00:00+00'::timestamptz),
('31000000-0000-4000-8000-000000000002'::uuid, 'The Velveteen Rabbit', 'Chu tho nhung', 'Margery Williams Bianco', 'en', 'stories', 'A toy rabbit discovers love, friendship, and what it means to become real.', 'Mot chu tho do choi kham pha tinh yeu thuong, tinh ban va y nghia cua viec tro nen that.', '2026-09-17 00:00:00+00'::timestamptz),
('31000000-0000-4000-8000-000000000003'::uuid, 'The Burgess Bird Book for Children', 'Sach ve chim cua Burgess cho tre em', 'Thornton W. Burgess', 'en', 'nature', 'A friendly introduction to birds, their habits, and how young readers can notice them outdoors.', 'Loi gioi thieu gan gui ve cac loai chim, tap tinh cua chung va cach tre quan sat chim ngoai troi.', '2026-09-17 00:00:00+00'::timestamptz),
('31000000-0000-4000-8000-000000000004'::uuid, 'Book about Animals', 'Sach ve dong vat', 'Rufus Merrill', 'en', 'nature', 'Short illustrated readings about animals including elephants, rabbits, antelopes, and polar bears.', 'Nhung bai doc ngan ve dong vat nhu voi, tho, linh duong va gau trang Bac Cuc.', '2026-09-17 00:00:00+00'::timestamptz),
('31000000-0000-4000-8000-000000000005'::uuid, 'Spiders', 'Nhen', 'Cecil Warburton', 'en', 'science', 'A natural science text about spider habits, webs, and close observation of small creatures.', 'Mot sach khoa hoc tu nhien ve tap tinh cua nhen, mang nhen va cach quan sat nhung sinh vat nho.', '2026-09-17 00:00:00+00'::timestamptz),
('31000000-0000-4000-8000-000000000006'::uuid, 'A Child''s Garden of Verses', 'Khu vuon tho cua tre em', 'Robert Louis Stevenson', 'en', 'stories', 'Classic poems that invite children to imagine gardens, play, travel, and everyday wonder.', 'Tap tho co dien goi mo tri tuong tuong cua tre ve khu vuon, tro choi, chuyen di va nhung dieu ky dieu hang ngay.', '2026-09-17 00:00:00+00'::timestamptz)
on conflict (id) do update
set title_en = excluded.title_en,
    title_vi = excluded.title_vi,
    author = excluded.author,
    language = excluded.language,
    topic = excluded.topic,
    description_en = excluded.description_en,
    description_vi = excluded.description_vi;

insert into public.book_copies (id, book_id, inventory_code, created_at) values
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
on conflict (id) do update
set book_id = excluded.book_id,
    inventory_code = excluded.inventory_code;
