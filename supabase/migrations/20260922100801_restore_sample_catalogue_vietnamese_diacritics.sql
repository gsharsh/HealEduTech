-- Restore proper Vietnamese diacritics for the hosted sample catalogue.
update public.books
set title_vi = 'Chuyện về chú thỏ Peter',
    description_vi = 'Câu chuyện về một chú thỏ tinh nghịch lẻn vào khu vườn của ông McGregor và học vì sao cần biết lắng nghe.'
where id = '31000000-0000-4000-8000-000000000001'::uuid;

update public.books
set title_vi = 'Chú thỏ nhung',
    description_vi = 'Một chú thỏ đồ chơi khám phá tình yêu thương, tình bạn và ý nghĩa của việc trở nên thật.'
where id = '31000000-0000-4000-8000-000000000002'::uuid;

update public.books
set title_vi = 'Sách về chim của Burgess cho trẻ em',
    description_vi = 'Lời giới thiệu gần gũi về các loài chim, tập tính của chúng và cách trẻ quan sát chim ngoài trời.'
where id = '31000000-0000-4000-8000-000000000003'::uuid;

update public.books
set title_vi = 'Sách về động vật',
    description_vi = 'Những bài đọc ngắn về động vật như voi, thỏ, linh dương và gấu trắng Bắc Cực.'
where id = '31000000-0000-4000-8000-000000000004'::uuid;

update public.books
set title_vi = 'Nhện',
    description_vi = 'Một sách khoa học tự nhiên về tập tính của nhện, mạng nhện và cách quan sát những sinh vật nhỏ.'
where id = '31000000-0000-4000-8000-000000000005'::uuid;

update public.books
set title_vi = 'Khu vườn thơ của trẻ em',
    description_vi = 'Tập thơ cổ điển gợi mở trí tưởng tượng của trẻ về khu vườn, trò chơi, chuyến đi và những điều kỳ diệu hằng ngày.'
where id = '31000000-0000-4000-8000-000000000006'::uuid;
